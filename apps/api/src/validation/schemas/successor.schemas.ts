import { z } from "zod";

/**
 * Schema for adding a successor
 */
export const AddSuccessorSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  name: z.string().min(1, "Name is required").optional(),
  handoverDelayDays: z
    .number()
    .int()
    .min(1, "Handover delay must be at least 1 day")
    .max(365, "Handover delay cannot exceed 365 days")
    .optional(),
});

/**
 * Schema for updating a successor
 */
export const UpdateSuccessorSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  handoverDelayDays: z
    .number()
    .int()
    .min(1, "Handover delay must be at least 1 day")
    .max(365, "Handover delay cannot exceed 365 days")
    .optional(),
});

/**
 * Schema for verifying a successor
 */
export const VerifySuccessorSchema = z.object({
  verificationToken: z.string().min(1, "Verification token is required").trim(),
});

/**
 * Schema for successor ID parameter
 */
export const SuccessorIdSchema = z.object({
  id: z.string().uuid("Invalid successor ID"),
});
