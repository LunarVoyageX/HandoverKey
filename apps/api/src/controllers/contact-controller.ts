import { Request, Response, NextFunction } from "express";
import { emailService } from "../services/email-service";
import { logger } from "../config/logger";

export class ContactController {
  static async submitContactForm(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { name, email, message } = req.body;

      // Send email to info@handoverkey.com
      await emailService.sendContactFormEmail(email, name, message);

      logger.info({ email, name }, "Contact form submitted successfully");

      res.status(200).json({
        message: "Thank you for your message. We'll get back to you soon!",
      });
    } catch (error) {
      logger.error(
        { err: error, email: req.body.email },
        "Failed to submit contact form",
      );
      next(error);
    }
  }
}
