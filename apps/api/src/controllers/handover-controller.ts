import { Request, Response, NextFunction } from "express";
import { HandoverOrchestrator } from "../services/handover-orchestrator";
import { HandoverService } from "../services/handover-service";
import { SuccessorService } from "../services/successor-service";
import { UserService } from "../services/user-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuthenticationError, NotFoundError } from "../errors";

export class HandoverController {
  static async getStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const handover = await HandoverService.getActiveHandover(req.user.userId);

      if (!handover) {
        res.json({ active: false, handover: null });
        return;
      }

      res.json({
        active: true,
        handover: {
          id: handover.id,
          status: handover.status,
          initiatedAt: handover.initiatedAt,
          gracePeriodEnds: handover.gracePeriodEnds,
          completedAt: handover.completedAt,
          createdAt: handover.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const reason = req.body.reason || "Cancelled by user";
      const cancelled = await HandoverService.cancelHandover(req.user.userId);

      if (!cancelled) {
        throw new NotFoundError("Active handover process");
      }

      await UserService.logActivity(
        req.user.userId,
        "HANDOVER_CANCELLED",
        req.ip,
      );

      res.json({ message: "Handover process cancelled", reason });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public endpoint for successors to accept or decline a handover.
   * Identified by verification token, not by authentication.
   */
  static async respond(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token, accepted, message } = req.body;

      const result = await SuccessorService.verifySuccessorByToken(token);

      if (!result.success || !result.userId || !result.successorId) {
        throw new AuthenticationError("Invalid or expired verification token");
      }

      const orchestrator = new HandoverOrchestrator();
      const handover = await orchestrator.getHandoverStatus(result.userId);

      if (!handover) {
        throw new NotFoundError("Active handover process");
      }

      await orchestrator.processSuccessorResponse(
        handover.id,
        result.successorId,
        { accepted, message },
      );

      const updatedHandover = await orchestrator.getHandoverStatus(
        result.userId,
      );

      await UserService.logActivity(
        result.userId,
        accepted ? "SUCCESSOR_ACCEPTED" : "SUCCESSOR_DECLINED",
        req.ip,
      );

      res.json({
        message: accepted
          ? "Handover accepted successfully"
          : "Handover declined",
        handoverId: handover.id,
        status: updatedHandover?.status ?? handover.status,
      });
    } catch (error) {
      next(error);
    }
  }
}
