import { Router } from "express";
import { SuccessorController } from "../controllers/successor-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { validateRequest, validateMultiple } from "../validation";
import {
  AddSuccessorSchema,
  UpdateSuccessorSchema,
  VerifySuccessorSchema,
  SuccessorIdSchema,
} from "../validation/schemas";

const router = Router();

// All successor routes require authentication
router.use(authenticateJWT);
router.use(requireAuth);

/**
 * Add a successor
 * POST /api/v1/successors
 */
router.post(
  "/",
  validateRequest(AddSuccessorSchema, "body"),
  SuccessorController.addSuccessor,
);

/**
 * Get all successors for the authenticated user
 * GET /api/v1/successors
 */
router.get("/", SuccessorController.getSuccessors);

/**
 * Get a single successor
 * GET /api/v1/successors/:id
 */
router.get(
  "/:id",
  validateRequest(SuccessorIdSchema, "params"),
  SuccessorController.getSuccessor,
);

/**
 * Update a successor
 * PUT /api/v1/successors/:id
 */
router.put(
  "/:id",
  validateMultiple({
    params: SuccessorIdSchema,
    body: UpdateSuccessorSchema,
  }),
  SuccessorController.updateSuccessor,
);

/**
 * Delete a successor
 * DELETE /api/v1/successors/:id
 */
router.delete(
  "/:id",
  validateRequest(SuccessorIdSchema, "params"),
  SuccessorController.deleteSuccessor,
);

/**
 * Resend verification email to successor
 * POST /api/v1/successors/:id/resend-verification
 */
router.post(
  "/:id/resend-verification",
  validateRequest(SuccessorIdSchema, "params"),
  SuccessorController.resendVerification,
);

/**
 * Verify a successor with verification token
 * POST /api/v1/successors/:id/verify
 */
router.post(
  "/:id/verify",
  validateMultiple({
    params: SuccessorIdSchema,
    body: VerifySuccessorSchema,
  }),
  SuccessorController.verifySuccessor,
);

/**
 * Verify a successor by token (public route for email verification)
 * GET /api/v1/successors/verify?token=...
 */
const verifyRouter = Router();
verifyRouter.get("/verify", SuccessorController.verifySuccessorByToken);

// Mount the public verify route before authentication middleware
export { verifyRouter };
export default router;
