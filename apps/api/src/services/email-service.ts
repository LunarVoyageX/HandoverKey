import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { readFileSync } from "fs";
import { join } from "path";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface TemplateVariables {
  [key: string]: string;
}

class TemplateEngine {
  private templatesPath: string;
  private templateCache: Map<string, string> = new Map();

  constructor() {
    this.templatesPath = join(__dirname, "email-templates");
  }

  private loadTemplate(templateName: string): string {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = join(this.templatesPath, `${templateName}.html`);
    const template = readFileSync(templatePath, "utf-8");
    this.templateCache.set(templateName, template);
    return template;
  }

  render(templateName: string, variables: TemplateVariables): string {
    let template = this.loadTemplate(templateName);

    // Replace all {{variable}} placeholders with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, value || "");
    });

    return template;
  }
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();

    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";

    console.log("[EmailService] SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user,
      passLength: pass.length,
    });

    const smtpConfig: SMTPTransport.Options = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendSuccessorVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationLink = `${baseUrl}/verify-successor?token=${verificationToken}`;
    const iconUrl = `${baseUrl}/email-icon.png`;

    const html = this.templateEngine.render("successor-verification", {
      verificationLink,
      iconUrl,
      year: new Date().getFullYear().toString(),
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Successor Status - HandoverKey",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Successor verification email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send successor verification email:", error);
      throw new Error("Failed to send successor verification email");
    }
  }

  async sendUserVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
    const iconUrl = `${baseUrl}/email-icon.png`;

    const html = this.templateEngine.render("user-verification", {
      verificationLink,
      iconUrl,
      year: new Date().getFullYear().toString(),
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Email - HandoverKey",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`User verification email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send user verification email:", error);
      throw new Error("Failed to send user verification email");
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const iconUrl = `${baseUrl}/email-icon.png`;

    const html = this.templateEngine.render("password-reset", {
      resetLink,
      iconUrl,
      year: new Date().getFullYear().toString(),
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Reset Your Password - HandoverKey",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendAccountDeletionConfirmation(
    email: string,
    name: string,
  ): Promise<void> {
    const iconUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/email-icon.png`;

    const html = this.templateEngine.render("account-deletion", {
      name,
      iconUrl,
      year: new Date().getFullYear().toString(),
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Account Deletion Confirmation - HandoverKey",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Account deletion confirmation sent to ${email}`);
    } catch (error) {
      console.error("Failed to send account deletion confirmation:", error);
      throw new Error("Failed to send account deletion confirmation");
    }
  }

  async sendAccountDeletionToSuccessors(
    email: string,
    userName: string,
  ): Promise<void> {
    const iconUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/email-icon.png`;

    const html = this.templateEngine.render("account-deletion-successor", {
      userName,
      iconUrl,
      year: new Date().getFullYear().toString(),
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "HandoverKey Account Deletion Notification",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Account deletion notification sent to successor ${email}`);
    } catch (error) {
      console.error(
        "Failed to send account deletion notification to successor:",
        error,
      );
      throw new Error(
        "Failed to send account deletion notification to successor",
      );
    }
  }
}

export const emailService = new EmailService();
