import { z } from "zod";

/**
 * Schema for manual check-in (no body required, but validate empty object)
 */
export const CheckInSchema = z.object({}).optional();

/**
 * Schema for secure check-in token in query params
 */
export const CheckInTokenQuerySchema = z.object({
  token: z.string().min(1, "Check-in token is required"),
});

/**
 * Schema for secure check-in token in request body
 */
export const CheckInTokenSchema = z.object({
  token: z.string().min(1, "Check-in token is required"),
});
