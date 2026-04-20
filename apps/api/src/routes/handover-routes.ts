import { Router } from "express";
import rateLimit from "express-rate-limit";
import { HandoverController } from "../controllers/handover-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { validateRequest } from "../validation";
import {
  HandoverRespondSchema,
  HandoverCancelSchema,
} from "../validation/schemas";

const router = Router();

router.use(authenticateJWT);
router.use(requireAuth);

/**
 * Get current handover status for the authenticated user
 * GET /api/v1/handover/status
 */
router.get("/status", HandoverController.getStatus);

/**
 * Cancel the active handover process
 * POST /api/v1/handover/cancel
 */
router.post(
  "/cancel",
  validateRequest(HandoverCancelSchema, "body"),
  HandoverController.cancel,
);

/**
 * Public endpoint for successors to accept or decline a handover.
 * Rate limited to prevent abuse.
 */
const publicHandoverRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicHandoverRouter = Router();
publicHandoverRouter.use(publicHandoverRateLimiter);

/**
 * Successor responds to handover (accept/decline)
 * POST /api/v1/handover/respond
 */
publicHandoverRouter.post(
  "/respond",
  validateRequest(HandoverRespondSchema, "body"),
  HandoverController.respond,
);

export { publicHandoverRouter };
export default router;
