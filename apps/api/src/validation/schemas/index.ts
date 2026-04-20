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
  UpdateProfileSchema,
  ChangePasswordSchema,
  TwoFactorSetupSchema,
  TwoFactorEnableSchema,
  TwoFactorDisableSchema,
} from "./auth.schemas";

// Vault schemas
export {
  CreateVaultEntrySchema,
  UpdateVaultEntrySchema,
  VaultQuerySchema,
  VaultEntryIdSchema,
  VaultImportSchema,
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
  UpdateSharesSchema,
  UpdateAssignedVaultEntriesSchema,
} from "./successor.schemas";

// Activity schemas
export {
  CheckInSchema,
  CheckInTokenQuerySchema,
  CheckInTokenSchema,
} from "./activity.schemas";

// Handover schemas
export {
  HandoverRespondSchema,
  HandoverCancelSchema,
} from "./handover.schemas";

// Contact schemas
export { ContactFormSchema } from "./contact.schemas";
