import { Router } from "express";
import { AdminController } from "../controllers/admin-controller";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// All admin routes require authentication
// TODO: Add admin role check middleware
router.use(authenticateJWT);

// Unlock a user account
router.post("/users/:userId/unlock", AdminController.unlockAccount);

// Get lockout status for a user
router.get("/users/:userId/lockout-status", AdminController.getLockoutStatus);

export default router;
