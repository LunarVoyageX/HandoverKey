import { Router } from "express";
import { ContactController } from "../controllers/contact-controller";
import { contactRateLimiter } from "../middleware/security";
import { validateRequest } from "../validation";
import { ContactFormSchema } from "../validation/schemas";

const router = Router();

// Contact form submission endpoint
router.post(
  "/",
  contactRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(ContactFormSchema, "body"),
  ContactController.submitContactForm,
);

export default router;
