import { z } from "zod";

/**
 * Schema for updating inactivity settings
 */
export const UpdateInactivitySettingsSchema = z
  .object({
    thresholdDays: z
      .number()
      .int("Threshold must be an integer")
      .min(30, "Threshold must be at least 30 days")
      .max(365, "Threshold must be at most 365 days")
      .optional(),
    requireMajority: z.boolean().optional(),
    warningDays: z.number().int().optional(),
    isPaused: z.boolean().optional(),
    notificationPreferences: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        push: z.boolean().optional(),
      })
      .optional(),
    reminderIntervals: z
      .array(
        z
          .number()
          .int("Reminder interval must be an integer")
          .min(1, "Reminder interval must be at least 1 day")
          .max(365, "Reminder interval cannot exceed 365 days"),
      )
      .max(5, "Maximum 5 reminder intervals allowed")
      .optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one field is being updated
      return Object.keys(data).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    },
  );

/**
 * Schema for pausing the dead man's switch
 */
export const PauseSwitchSchema = z.object({
  pauseUntil: z
    .string()
    .datetime("Invalid date format")
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

/**
 * Schema for resume switch (no body required, but validate empty object)
 */
export const ResumeSwitchSchema = z.object({}).optional();

/**
 * Schema for configuring handover threshold
 */
export const ConfigureThresholdSchema = z
  .object({
    thresholdDays: z
      .number()
      .int("Threshold must be an integer")
      .min(30, "Threshold must be at least 30 days")
      .max(365, "Threshold must be at most 365 days"),
    warningPercentages: z
      .array(
        z
          .number()
          .min(1, "Warning percentage must be at least 1%")
          .max(99, "Warning percentage must be less than 100%"),
      )
      .min(1, "At least one warning percentage is required")
      .max(5, "Maximum 5 warning percentages allowed")
      .optional()
      .default([75, 85, 95]),
  })
  .refine(
    (data) => {
      // Ensure warning percentages are in ascending order if provided
      if (data.warningPercentages && data.warningPercentages.length > 1) {
        for (let i = 1; i < data.warningPercentages.length; i++) {
          if (data.warningPercentages[i] <= data.warningPercentages[i - 1]) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: "Warning percentages must be in ascending order",
      path: ["warningPercentages"],
    },
  );

/**
 * Schema for adding a successor
 */
export const AddSuccessorSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters")
    .trim(),
  shareThreshold: z
    .number()
    .int("Share threshold must be an integer")
    .min(1, "Share threshold must be at least 1")
    .max(10, "Share threshold cannot exceed 10")
    .optional(),
});

/**
 * Schema for updating a successor
 */
export const UpdateSuccessorSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200, "Name must be less than 200 characters")
      .trim()
      .optional(),
    email: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one field is being updated
      return Object.keys(data).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    },
  );

/**
 * Schema for successor ID parameter
 */
export const SuccessorIdSchema = z.object({
  id: z.string().uuid("Invalid successor ID"),
});
