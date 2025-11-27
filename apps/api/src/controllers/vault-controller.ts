import { Response, NextFunction } from "express";
import { VaultService } from "../services/vault-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuthenticationError, NotFoundError } from "../errors";

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

      // Convert binary data to base64 for JSON response
      const responseEntries = entries.map((entry) => ({
        id: entry.id,
        encryptedData: Buffer.from(entry.encryptedData.data).toString("base64"),
        iv: Buffer.from(entry.encryptedData.iv).toString("base64"),
        algorithm: entry.encryptedData.algorithm,
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

  static async getEntry(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { id } = req.params;
      const entry = await VaultService.getEntry(req.user.userId, id);

      if (!entry) {
        throw new NotFoundError("Vault entry");
      }

      res.json({
        id: entry.id,
        encryptedData: Buffer.from(entry.encryptedData.data).toString("base64"),
        iv: Buffer.from(entry.encryptedData.iv).toString("base64"),
        algorithm: entry.encryptedData.algorithm,
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
      const { id } = req.params;
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

      const { id } = req.params;
      const deleted = await VaultService.deleteEntry(req.user.userId, id);

      if (!deleted) {
        throw new NotFoundError("Vault entry");
      }

      res.json({ message: "Vault entry deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
