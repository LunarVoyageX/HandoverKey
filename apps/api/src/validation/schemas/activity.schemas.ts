import { z } from "zod";

/**
 * Schema for manual check-in (no body required, but validate empty object)
 */
export const CheckInSchema = z.object({}).optional();
