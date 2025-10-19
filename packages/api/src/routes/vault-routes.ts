import { Router } from "express";
import { VaultController } from "../controllers/vault-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";

const router = Router();

// All vault routes require authentication
router.use(authenticateJWT);
router.use(requireAuth);

// Track vault access for all routes
router.use(SimpleActivityMiddleware.trackActivity("VAULT_ACCESS"));

// Create vault entry
router.post(
  "/entries",
  VaultController.createEntryValidation,
  VaultController.createEntry,
);

// Get all vault entries for user
router.get("/entries", VaultController.getEntries);

// Get single vault entry
router.get("/entries/:id", VaultController.getEntry);

// Update vault entry
router.put(
  "/entries/:id",
  VaultController.updateEntryValidation,
  VaultController.updateEntry,
);

// Delete vault entry
router.delete("/entries/:id", VaultController.deleteEntry);

export default router;
