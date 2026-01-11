import { getDatabaseClient, SuccessorRepository } from "@handoverkey/database";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { ConflictError, NotFoundError } from "../errors";

export interface AddSuccessorData {
  email: string;
  name?: string;
  handoverDelayDays?: number;
  encryptedShare?: string;
}

export interface UpdateSuccessorData {
  name?: string;
  handoverDelayDays?: number;
  encryptedShare?: string;
}

export interface Successor {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  handoverDelayDays: number;
  encryptedShare: string | null;
  createdAt: Date;
}

export class SuccessorService {
  private static getSuccessorRepository(): SuccessorRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorRepository(dbClient.getKysely());
  }

  static async addSuccessor(
    userId: string,
    data: AddSuccessorData,
  ): Promise<Successor> {
    const id = uuidv4();
    const successorRepo = this.getSuccessorRepository();

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    let successor;
    try {
      successor = await successorRepo.create({
        id,
        user_id: userId,
        email: data.email.toLowerCase().trim(),
        name: data.name ?? null,
        verification_token: verificationToken,
        verified: false,
        handover_delay_days: data.handoverDelayDays ?? 90,
        encrypted_share: data.encryptedShare ?? null,
      });
    } catch (error: unknown) {
      // Check for unique constraint violation (Postgres code 23505)
      const dbError = error as { originalError?: { code?: string } };
      if (dbError.originalError?.code === "23505") {
        throw new ConflictError("Successor with this email already exists");
      }
      throw error;
    }

    // Send verification email
    try {
      const { emailService } = await import("./email-service");
      await emailService.sendSuccessorVerificationEmail(
        successor.email,
        verificationToken,
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Don't fail the successor creation if email fails
    }

    return {
      id: successor.id,
      email: successor.email,
      name: successor.name,
      verified: successor.verified,
      handoverDelayDays: successor.handover_delay_days,
      encryptedShare: successor.encrypted_share,
      createdAt: successor.created_at,
    };
  }

  static async getSuccessors(userId: string): Promise<Successor[]> {
    const successorRepo = this.getSuccessorRepository();
    const successors = await successorRepo.findByUserId(userId);

    return successors.map((s) => ({
      id: s.id,
      email: s.email,
      name: s.name,
      verified: s.verified,
      handoverDelayDays: s.handover_delay_days,
      encryptedShare: s.encrypted_share,
      createdAt: s.created_at,
    }));
  }

  static async getSuccessor(
    userId: string,
    successorId: string,
  ): Promise<Successor | null> {
    const successorRepo = this.getSuccessorRepository();
    const successor = await successorRepo.findById(successorId);

    if (!successor || successor.user_id !== userId) {
      return null;
    }

    return {
      id: successor.id,
      email: successor.email,
      name: successor.name,
      verified: successor.verified,
      handoverDelayDays: successor.handover_delay_days,
      encryptedShare: successor.encrypted_share,
      createdAt: successor.created_at,
    };
  }

  static async updateSuccessor(
    userId: string,
    successorId: string,
    data: UpdateSuccessorData,
  ): Promise<Successor | null> {
    const successorRepo = this.getSuccessorRepository();

    // Verify ownership
    const existing = await successorRepo.findById(successorId);
    if (!existing || existing.user_id !== userId) {
      return null;
    }

    const updateData: { name?: string; handover_delay_days?: number } = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.handoverDelayDays !== undefined) {
      updateData.handover_delay_days = data.handoverDelayDays;
    }

    const successor = await successorRepo.update(successorId, updateData);

    return {
      id: successor.id,
      email: successor.email,
      name: successor.name,
      verified: successor.verified,
      handoverDelayDays: successor.handover_delay_days,
      encryptedShare: successor.encrypted_share,
      createdAt: successor.created_at,
    };
  }

  static async deleteSuccessor(
    userId: string,
    successorId: string,
  ): Promise<boolean> {
    const successorRepo = this.getSuccessorRepository();

    // Verify ownership
    const existing = await successorRepo.findById(successorId);
    if (!existing || existing.user_id !== userId) {
      return false;
    }

    try {
      await successorRepo.delete(successorId);
      return true;
    } catch {
      return false;
    }
  }

  static async verifySuccessor(
    successorId: string,
    verificationToken: string,
  ): Promise<boolean> {
    const successorRepo = this.getSuccessorRepository();
    const successor = await successorRepo.findById(successorId);

    if (
      !successor ||
      successor.verification_token !== verificationToken ||
      successor.verified
    ) {
      return false;
    }

    await successorRepo.update(successorId, {
      verified: true,
    });

    return true;
  }

  static async updateShares(
    userId: string,
    shares: { id: string; encryptedShare: string }[],
  ): Promise<void> {
    const successorRepo = this.getSuccessorRepository();

    // 1. Validate ownership of all successors
    for (const share of shares) {
      const successor = await successorRepo.findById(share.id);
      if (!successor || successor.user_id !== userId) {
        throw new NotFoundError(`Successor not found: ${share.id}`);
      }
    }

    // 2. Perform updates
    for (const share of shares) {
      await successorRepo.update(share.id, {
        encrypted_share: share.encryptedShare,
      });
    }
  }

  static async verifySuccessorByToken(verificationToken: string): Promise<{
    success: boolean;
    alreadyVerified: boolean;
    userId?: string;
    userName?: string;
    handoverStatus?: string;
  }> {
    const successorRepo = this.getSuccessorRepository();
    const db = successorRepo["db"]; // Access the kysely instance

    // Find successor by verification token
    const successor = await db
      .selectFrom("successors")
      .innerJoin("users", "users.id", "successors.user_id")
      .leftJoin("handover_processes", "handover_processes.user_id", "users.id")
      .select([
        "successors.id",
        "successors.user_id",
        "successors.verified",
        "users.name as user_name",
        "handover_processes.status as handover_status",
      ])
      .where("successors.verification_token", "=", verificationToken)
      .orderBy("handover_processes.initiated_at", "desc")
      .executeTakeFirst();

    if (!successor) {
      return { success: false, alreadyVerified: false };
    }

    if (successor.verified) {
      return {
        success: true,
        alreadyVerified: true,
        userId: successor.user_id,
        userName: successor.user_name || undefined,
        handoverStatus: (successor.handover_status as string) || undefined,
      };
    }

    // Update to verified
    await successorRepo.update(successor.id, {
      verified: true,
    });

    return {
      success: true,
      alreadyVerified: false,
      userId: successor.user_id,
      userName: successor.user_name || undefined,
      handoverStatus: (successor.handover_status as string) || undefined,
    };
  }

  static async resendVerification(
    userId: string,
    successorId: string,
  ): Promise<void> {
    const successorRepo = this.getSuccessorRepository();
    const successor = await successorRepo.findById(successorId);

    if (!successor || successor.user_id !== userId) {
      throw new NotFoundError("Successor");
    }

    if (successor.verified) {
      throw new ConflictError("Successor already verified");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await successorRepo.update(successorId, {
      verification_token: verificationToken,
    });

    // Send verification email
    try {
      const { emailService } = await import("./email-service");
      await emailService.sendSuccessorVerificationEmail(
        successor.email,
        verificationToken,
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // If email fails, we should probably let the user know, but for now we'll just log it
      // and allow them to retry via the resend endpoint
      throw new Error("Failed to send verification email");
    }
  }
}
