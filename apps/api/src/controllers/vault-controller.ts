import { Request, Response, NextFunction } from "express";
import { VaultService } from "../services/vault-service";
import { UserService } from "../services/user-service";
import { SuccessorService } from "../services/successor-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuthenticationError, NotFoundError } from "../errors";
import { HandoverProcessStatus } from "@handoverkey/shared/src/types/dead-mans-switch";

export class VaultController {
  static async createEntry(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      // Data is already validated and sanitized by Zod middleware
      const { encryptedData, iv, salt, algorithm, category, tags } = req.body;

      const entry = await VaultService.createEntry(
        req.user.userId,
        {
          data: Buffer.from(encryptedData, "base64"),
          iv: Buffer.from(iv, "base64"),
          algorithm,
        },
        Buffer.from(salt, "base64"),
        category,
        tags,
      );

      await UserService.logActivity(req.user.userId, "SECRET_CREATED", req.ip);

      res.status(201).json({
        id: entry.id,
        message: "Vault entry created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEntries(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { category, tag, search } = req.query;

      const entries = await VaultService.getUserEntries(req.user.userId, {
        category: category as string,
        tag: tag as string,
        search: search as string,
      });

      // Prevent caching of sensitive vault data
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");

      // Convert binary data to base64 for JSON response
      const responseEntries = entries.map((entry) => ({
        id: entry.id,
        encryptedData: entry.encryptedData,
        iv: entry.iv,
        algorithm: entry.algorithm,
        category: entry.category,
        tags: entry.tags,
        version: entry.version,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }));

      res.json(responseEntries);
    } catch (error) {
      next(error);
    }
  }

  static async exportEntries(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const exportPayload = await VaultService.exportUserVault(req.user.userId);
      await UserService.logActivity(req.user.userId, "VAULT_EXPORTED", req.ip);

      res.set(
        "Content-Disposition",
        `attachment; filename="handoverkey-vault-export-${new Date().toISOString().slice(0, 10)}.json"`,
      );
      res.json(exportPayload);
    } catch (error) {
      next(error);
    }
  }

  static async importEntries(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { mode, entries } = req.body;
      const result = await VaultService.importUserVault(req.user.userId, {
        mode,
        entries,
      });

      await UserService.logActivity(req.user.userId, "VAULT_IMPORTED", req.ip);
      res.json({
        message: "Vault import completed",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEntry(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const id = String(req.params.id);
      const entry = await VaultService.getEntry(req.user.userId, id);

      if (!entry) {
        throw new NotFoundError("Vault entry");
      }

      res.json({
        id: entry.id,
        encryptedData: entry.encryptedData,
        iv: entry.iv,
        algorithm: entry.algorithm,
        category: entry.category,
        tags: entry.tags,
        version: entry.version,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      // Data is already validated and sanitized by Zod middleware
      const id = String(req.params.id);
      const { encryptedData, iv, algorithm, category, tags } = req.body;

      const entry = await VaultService.updateEntry(
        req.user.userId,
        id,
        {
          data: Buffer.from(encryptedData, "base64"),
          iv: Buffer.from(iv, "base64"),
          algorithm,
        },
        category,
        tags,
      );

      if (!entry) {
        throw new NotFoundError("Vault entry");
      }

      await UserService.logActivity(req.user.userId, "SECRET_UPDATED", req.ip);

      res.json({ message: "Vault entry updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEntry(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const id = String(req.params.id);

      const deleted = await VaultService.deleteEntry(req.user.userId, id);

      if (!deleted) {
        throw new NotFoundError("Vault entry");
      }

      await UserService.logActivity(req.user.userId, "SECRET_DELETED", req.ip);

      res.json({ message: "Vault entry deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
  static async getSuccessorEntries(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        throw new AuthenticationError("Verification token is required");
      }

      // 1. Verify successor token and get metadata
      const result = await SuccessorService.verifySuccessorByToken(token);

      if (!result.success || !result.userId) {
        throw new AuthenticationError("Invalid or expired verification token");
      }

      // 2. Check handover status
      const allowedStatuses: string[] = [
        HandoverProcessStatus.AWAITING_SUCCESSORS,
        HandoverProcessStatus.COMPLETED,
      ];
      if (
        !result.handoverStatus ||
        !allowedStatuses.includes(result.handoverStatus)
      ) {
        res.status(403).json({
          error: "Handover access is not yet open",
          status: result.handoverStatus,
        });
        return;
      }

      // 3. Get encrypted entries
      const entries = await VaultService.getSuccessorEntries(
        result.userId,
        result.successorId,
      );

      // Log the access
      await UserService.logActivity(
        result.userId,
        "SUCCESSOR_VAULT_ACCESS",
        req.ip,
      );

      // Prevent caching
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );

      const responseEntries = entries.map((entry) => ({
        id: entry.id,
        encryptedData: entry.encryptedData,
        iv: entry.iv,
        algorithm: entry.algorithm,
        category: entry.category,
        tags: entry.tags,
        version: entry.version,
      }));

      res.json({
        ownerName: result.userName,
        entries: responseEntries,
      });
    } catch (error) {
      next(error);
    }
  }
}
