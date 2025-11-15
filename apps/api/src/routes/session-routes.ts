import { Router } from "express";
import { SessionController } from "../controllers/session-controller";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// All session routes require authentication
router.use(authenticateJWT);

// Get all active sessions
router.get("/", SessionController.getSessions);

// Invalidate a specific session
router.delete("/:sessionId", SessionController.invalidateSession);

// Invalidate all other sessions
router.post("/invalidate-others", SessionController.invalidateAllOtherSessions);

export default router;
