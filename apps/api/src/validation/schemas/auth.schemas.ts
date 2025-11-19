import { z } from "zod";

/**
 * Schema for user registration
 */
export const RegisterSchema = z
  .object({
    email: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password confirmation does not match password",
    path: ["confirmPassword"],
  });

/**
 * Schema for user login
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Two-factor code must be 6 digits")
    .optional(),
});

/**
 * Schema for token refresh
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Schema for password reset request
 */
export const PasswordResetRequestSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
});

/**
 * Schema for password reset confirmation
 */
export const PasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password confirmation does not match password",
    path: ["confirmPassword"],
  });

/**
 * Schema for password change (authenticated user)
 */
export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });
