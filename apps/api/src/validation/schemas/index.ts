/**
 * Central export for all validation schemas
 */

// Auth schemas
export {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  PasswordChangeSchema,
} from "./auth.schemas";

// Vault schemas
export {
  CreateVaultEntrySchema,
  UpdateVaultEntrySchema,
  VaultQuerySchema,
  VaultEntryIdSchema,
} from "./vault.schemas";

// Inactivity schemas
export {
  UpdateInactivitySettingsSchema,
  PauseSwitchSchema,
  ResumeSwitchSchema,
  ConfigureThresholdSchema,
} from "./inactivity.schemas";

// Successor schemas
export {
  AddSuccessorSchema,
  UpdateSuccessorSchema,
  VerifySuccessorSchema,
  SuccessorIdSchema,
} from "./successor.schemas";

// Activity schemas
export { CheckInSchema } from "./activity.schemas";
