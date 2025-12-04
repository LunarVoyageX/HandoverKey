import { getDatabaseClient, SuccessorRepository } from "@handoverkey/database";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface AddSuccessorData {
  email: string;
  name?: string;
  handoverDelayDays?: number;
}

export interface UpdateSuccessorData {
  name?: string;
  handoverDelayDays?: number;
}

export interface Successor {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  handoverDelayDays: number;
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

    const successor = await successorRepo.create({
      id,
      user_id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name ?? null,
      verification_token: verificationToken,
      verified: false,
      handover_delay_days: data.handoverDelayDays ?? 90,
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
      // Don't fail the successor creation if email fails
    }

    return {
      id: successor.id,
      email: successor.email,
      name: successor.name,
      verified: successor.verified,
      handoverDelayDays: successor.handover_delay_days,
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
      verification_token: null,
    });

    return true;
  }
}
