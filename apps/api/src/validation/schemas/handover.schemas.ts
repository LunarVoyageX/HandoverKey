import { z } from "zod";

export const HandoverRespondSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
  accepted: z.boolean(),
  message: z.string().max(500).optional(),
});

export const HandoverCancelSchema = z.object({
  reason: z.string().max(500).optional(),
});
