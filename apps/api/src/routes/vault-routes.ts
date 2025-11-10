import { Router } from "express";
import { VaultController } from "../controllers/vault-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";
import { validateRequest, validateMultiple } from "../validation";
import {
  CreateVaultEntrySchema,
  UpdateVaultEntrySchema,
  VaultQuerySchema,
  VaultEntryIdSchema,
} from "../validation/schemas";

const router = Router();

// All vault routes require authentication
router.use(authenticateJWT);
router.use(requireAuth);

// Track vault access for all routes
router.use(SimpleActivityMiddleware.trackActivity("VAULT_ACCESS"));

// Create vault entry
router.post(
  "/entries",
  validateRequest(CreateVaultEntrySchema, 'body'),
  VaultController.createEntry,
);

// Get all vault entries for user
router.get(
  "/entries",
  validateRequest(VaultQuerySchema, 'query'),
  VaultController.getEntries,
);

// Get single vault entry
router.get(
  "/entries/:id",
  validateRequest(VaultEntryIdSchema, 'params'),
  VaultController.getEntry,
);

// Update vault entry
router.put(
  "/entries/:id",
  validateMultiple({
    params: VaultEntryIdSchema,
    body: UpdateVaultEntrySchema,
  }),
  VaultController.updateEntry,
);

// Delete vault entry
router.delete(
  "/entries/:id",
  validateRequest(VaultEntryIdSchema, 'params'),
  VaultController.deleteEntry,
);

export default router;
