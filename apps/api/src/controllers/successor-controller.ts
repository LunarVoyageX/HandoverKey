import { Response, NextFunction } from "express";
import { SuccessorService } from "../services/successor-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuthenticationError, NotFoundError } from "../errors";

export class SuccessorController {
  static async addSuccessor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { email, name, handoverDelayDays } = req.body;

      const successor = await SuccessorService.addSuccessor(req.user.userId, {
        email,
        name,
        handoverDelayDays,
      });

      res.status(201).json({
        message: "Successor added successfully",
        successor,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSuccessors(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const successors = await SuccessorService.getSuccessors(req.user.userId);

      res.json({ successors });
    } catch (error) {
      next(error);
    }
  }

  static async getSuccessor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { id } = req.params;
      const successor = await SuccessorService.getSuccessor(
        req.user.userId,
        id,
      );

      if (!successor) {
        throw new NotFoundError("Successor");
      }

      res.json(successor);
    } catch (error) {
      next(error);
    }
  }

  static async updateSuccessor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { id } = req.params;
      const { name, handoverDelayDays } = req.body;

      const successor = await SuccessorService.updateSuccessor(
        req.user.userId,
        id,
        {
          name,
          handoverDelayDays,
        },
      );

      if (!successor) {
        throw new NotFoundError("Successor");
      }

      res.json({
        message: "Successor updated successfully",
        successor,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSuccessor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { id } = req.params;
      const deleted = await SuccessorService.deleteSuccessor(
        req.user.userId,
        id,
      );

      if (!deleted) {
        throw new NotFoundError("Successor");
      }

      res.json({ message: "Successor deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async verifySuccessor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { verificationToken } = req.body;

      const verified = await SuccessorService.verifySuccessor(
        id,
        verificationToken,
      );

      if (!verified) {
        res.status(400).json({
          error: "Invalid verification token or successor already verified",
        });
        return;
      }

      res.json({ message: "Successor verified successfully" });
    } catch (error) {
      next(error);
    }
  }
}
