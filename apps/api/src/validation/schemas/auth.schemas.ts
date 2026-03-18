import { z } from "zod";

const base64Regex = /^[A-Za-z0-9+/]+=*$/;

/**
 * Schema for user registration
 */
export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters long")
      .optional(),
    email: z
      .string()
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters long"),
    // Removed complexity regex because we are now sending a hashed Auth Key (hex string)
    // which might not contain special characters or uppercase letters depending on the hash format.
    // The client is responsible for enforcing password complexity on the original password.
    confirmPassword: z.string(),
    salt: z.string().optional(), // Added salt field for Zero-Knowledge registration
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
  recoveryCode: z
    .string()
    .regex(
      /^[A-F0-9]{6}-[A-F0-9]{6}$/,
      "Recovery code must be in format XXXXXX-XXXXXX",
    )
    .optional(),
});

/**
 * Schema for token refresh
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
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
      .min(12, "Password must be at least 12 characters long"),
    // Removed complexity regex because we are now sending a hashed Auth Key (hex string)
    confirmPassword: z.string(),
    salt: z.string().optional(), // Added salt field for Zero-Knowledge password reset
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
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
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

/**
 * Schema for profile update (authenticated user)
 */
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be less than 100 characters")
    .trim(),
});

/**
 * Schema for vault entry re-encryption payload during password change
 */
const ReEncryptedVaultEntrySchema = z.object({
  id: z.string().uuid("Invalid vault entry ID"),
  encryptedData: z
    .string()
    .min(1, "Encrypted data is required")
    .regex(base64Regex, "Encrypted data must be valid base64"),
  iv: z
    .string()
    .min(1, "IV is required")
    .regex(base64Regex, "IV must be valid base64")
    .length(16, "IV must be 16 characters (12 bytes base64)"),
  salt: z
    .string()
    .min(1, "Salt is required")
    .regex(base64Regex, "Salt must be valid base64"),
  algorithm: z.literal("AES-GCM").or(z.literal("AES-256-GCM")),
  category: z.string().max(100).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional(),
});

/**
 * Schema for authenticated password change + vault re-encryption
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(12, "Current password is required")
      .max(256),
    newPassword: z.string().min(12, "New password is required").max(256),
    confirmPassword: z.string().min(12, "Password confirmation is required"),
    newSalt: z
      .string()
      .min(1, "New encryption salt is required")
      .regex(base64Regex, "New salt must be valid base64"),
    reEncryptedEntries: z.array(ReEncryptedVaultEntrySchema),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

/**
 * Schema for two-factor setup request
 */
export const TwoFactorSetupSchema = z.object({}).optional();

/**
 * Schema for two-factor enable request
 */
export const TwoFactorEnableSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Two-factor code must be 6 digits"),
});

/**
 * Schema for two-factor disable request
 */
export const TwoFactorDisableSchema = z
  .object({
    currentPassword: z.string().min(12, "Current password is required"),
    token: z
      .string()
      .regex(/^\d{6}$/, "Two-factor code must be 6 digits")
      .optional(),
    recoveryCode: z
      .string()
      .regex(
        /^[A-F0-9]{6}-[A-F0-9]{6}$/,
        "Recovery code must be in format XXXXXX-XXXXXX",
      )
      .optional(),
  })
  .refine((data) => data.token || data.recoveryCode, {
    message: "Either two-factor code or recovery code is required",
    path: ["token"],
  });
