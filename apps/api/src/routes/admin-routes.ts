import { Router } from "express";
import { AdminController } from "../controllers/admin-controller";
import { authenticateJWT } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

router.use(authenticateJWT);
router.use(requireAdmin);

// Dashboard summary
router.get("/dashboard", AdminController.getDashboard);

// User search/list
router.get("/users", AdminController.listUsers);

// Unlock a user account
router.post("/users/:userId/unlock", AdminController.unlockAccount);

// Get lockout status for a user
router.get("/users/:userId/lockout-status", AdminController.getLockoutStatus);

export default router;
