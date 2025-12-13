import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    // You can use Gmail, Outlook, or any SMTP service
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";

    // Debug: Log credentials (mask password)
    console.log("[EmailService] SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user,
      passLength: pass.length,
      passFirst3: pass.substring(0, 3),
      passLast3: pass.substring(pass.length - 3),
    });

    const smtpConfig: SMTPTransport.Options = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if needed
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

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Successor Status - HandoverKey",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background-color: #F9FAFB;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              border: 1px solid #F3F4F6;
            }
            .header {
              background-color: #ffffff;
              padding: 40px 30px 30px;
              text-align: center;
              border-bottom: 1px solid #F3F4F6;
            }
            .logo {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #007AFF 0%, #0062CC 100%);
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 16px;
              font-size: 28px;
              box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
            }
            .header h1 {
              color: #111827;
              font-size: 26px;
              font-weight: 600;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 30px;
              background-color: #ffffff;
            }
            .content h2 {
              color: #111827;
              font-size: 22px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .content p {
              color: #4B5563;
              font-size: 15px;
              line-height: 1.7;
              margin-bottom: 16px;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button {
              display: inline-block;
              background: #007AFF;
              color: #ffffff !important;
              padding: 13px 32px;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 4px 6px -1px rgba(0, 122, 255, 0.2), 0 2px 4px -1px rgba(0, 122, 255, 0.1);
              transition: all 0.2s ease;
            }
            .info-box {
              background: linear-gradient(to right, #DBEAFE, #BFDBFE);
              border-left: 3px solid #007AFF;
              padding: 16px 20px;
              margin: 24px 0;
              border-radius: 10px;
            }
            .info-box p {
              color: #1E3A8A;
              font-size: 14px;
              margin: 0;
              line-height: 1.6;
            }
            .what-next {
              background-color: #F9FAFB;
              border-radius: 10px;
              padding: 20px;
              margin: 24px 0;
            }
            .what-next h3 {
              color: #111827;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .what-next ul {
              margin: 0;
              padding-left: 20px;
            }
            .what-next li {
              color: #4B5563;
              font-size: 14px;
              line-height: 1.7;
              margin-bottom: 8px;
            }
            .footer {
              background-color: #F9FAFB;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #E5E7EB;
            }
            .footer p {
              color: #6B7280;
              font-size: 13px;
              margin-bottom: 6px;
            }
            .divider {
              height: 1px;
              background-color: #E5E7EB;
              margin: 28px 0;
            }
            @media only screen and (max-width: 600px) {
              body {
                padding: 0;
              }
              .email-wrapper {
                border-radius: 0;
                border-left: none;
                border-right: none;
              }
              .header, .content, .footer {
                padding: 24px 20px;
              }
              .content h2 {
                font-size: 20px;
              }
              .button {
                display: block;
                width: 100%;
                padding: 14px 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">🔐</div>
              <h1>HandoverKey</h1>
            </div>
            
            <div class="content">
              <h2>You've Been Added as a Successor</h2>
              <p>Hello,</p>
              <p>You have been designated as a successor for a HandoverKey account. This means you will receive access to encrypted digital assets in the event of the account holder's prolonged inactivity.</p>
              
              <div class="info-box">
                <p><strong>🔔 Action Required:</strong> Please verify your email address to confirm your successor status.</p>
              </div>
              
              <div class="button-container">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              
              <div class="what-next">
                <h3>What happens next?</h3>
                <ul>
                  <li>Click the verification button above to confirm your email</li>
                  <li>Your successor status will be activated</li>
                  <li>You'll be notified if the handover process is initiated</li>
                  <li>Your access will remain secure until needed</li>
                </ul>
              </div>
              
              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6B7280;">
                If you did not expect this email or believe it was sent in error, you can safely ignore it. Your email will not be added as a successor without verification.
              </p>
              
              <p style="font-size: 14px; color: #6B7280; margin-top: 16px;">
                This is an automated message. For questions about HandoverKey, please contact the account holder who added you.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} HandoverKey. All rights reserved.</p>
              <p>Your digital legacy, securely managed.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
You've Been Added as a Successor - HandoverKey

Hello,

You have been designated as a successor for a HandoverKey account. This means you will receive access to encrypted digital assets in the event of the account holder's prolonged inactivity.

🔔 ACTION REQUIRED: Please verify your email address to confirm your successor status.

Verify your email by clicking this link:
${verificationLink}

What happens next?
- Click the verification link above to confirm your email
- Your successor status will be activated
- You'll be notified if the handover process is initiated
- Your access will remain secure until needed

If you did not expect this email or believe it was sent in error, you can safely ignore it. Your email will not be added as a successor without verification.

This is an automated message. For questions about HandoverKey, please contact the account holder who added you.

---
© ${new Date().getFullYear()} HandoverKey. All rights reserved.
Your digital legacy, securely managed.
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Reset Your Password - HandoverKey",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background-color: #F9FAFB;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              border: 1px solid #F3F4F6;
            }
            .header {
              background-color: #ffffff;
              padding: 40px 30px 30px;
              text-align: center;
              border-bottom: 1px solid #F3F4F6;
            }
            .logo {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #007AFF 0%, #0062CC 100%);
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 16px;
              font-size: 28px;
              box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
            }
            .header h1 {
              color: #111827;
              font-size: 26px;
              font-weight: 600;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 30px;
              background-color: #ffffff;
            }
            .content h2 {
              color: #111827;
              font-size: 22px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .content p {
              color: #4B5563;
              font-size: 15px;
              line-height: 1.7;
              margin-bottom: 16px;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button {
              display: inline-block;
              background: #007AFF;
              color: #ffffff !important;
              padding: 13px 32px;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 4px 6px -1px rgba(0, 122, 255, 0.2), 0 2px 4px -1px rgba(0, 122, 255, 0.1);
              transition: all 0.2s ease;
            }
            .info-box {
              background: linear-gradient(to right, #FEF3C7, #FDE68A);
              border-left: 3px solid #F59E0B;
              padding: 16px 20px;
              margin: 24px 0;
              border-radius: 10px;
            }
            .info-box p {
              color: #78350F;
              font-size: 14px;
              margin: 0;
              line-height: 1.6;
            }
            .footer {
              background-color: #F9FAFB;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #E5E7EB;
            }
            .footer p {
              color: #6B7280;
              font-size: 13px;
              margin-bottom: 6px;
            }
            .divider {
              height: 1px;
              background-color: #E5E7EB;
              margin: 28px 0;
            }
            @media only screen and (max-width: 600px) {
              body {
                padding: 0;
              }
              .email-wrapper {
                border-radius: 0;
                border-left: none;
                border-right: none;
              }
              .header, .content, .footer {
                padding: 24px 20px;
              }
              .content h2 {
                font-size: 20px;
              }
              .button {
                display: block;
                width: 100%;
                padding: 14px 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">🔐</div>
              <h1>HandoverKey</h1>
            </div>
            
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hello,</p>
              <p>We received a request to reset the password for your HandoverKey account. If you made this request, click the button below to create a new password.</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              
              <div class="info-box">
                <p><strong>⏰ Important:</strong> This link will expire in 1 hour for your security.</p>
              </div>
              
              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6B7280;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <p style="font-size: 14px; color: #6B7280; margin-top: 16px;">
                For security reasons, we never include passwords in our emails. If you have any concerns about your account security, please contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} HandoverKey. All rights reserved.</p>
              <p>Your digital legacy, securely managed.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Reset Your Password - HandoverKey

Hello,

We received a request to reset the password for your HandoverKey account.

Click the link below to reset your password:
${resetLink}

⏰ IMPORTANT: This link will expire in 1 hour for your security.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, we never include passwords in our emails. If you have any concerns about your account security, please contact our support team.

---
© ${new Date().getFullYear()} HandoverKey. All rights reserved.
Your digital legacy, securely managed.
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendAccountDeletionEmail(email: string, name?: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Account Deleted - HandoverKey",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background-color: #F9FAFB;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              border: 1px solid #F3F4F6;
            }
            .header {
              background-color: #ffffff;
              padding: 40px 30px 30px;
              text-align: center;
              border-bottom: 1px solid #F3F4F6;
            }
            .logo {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
              border-radius: 14px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
            }
            .logo svg {
              width: 32px;
              height: 32px;
              color: white;
            }
            .content {
              padding: 40px 30px;
              color: #374151;
            }
            h1 {
              color: #111827;
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 16px;
              text-align: center;
              letter-spacing: -0.025em;
            }
            p {
              margin-bottom: 24px;
              font-size: 16px;
              color: #4B5563;
            }
            .footer {
              background-color: #F9FAFB;
              padding: 30px;
              text-align: center;
              font-size: 13px;
              color: #6B7280;
              border-top: 1px solid #F3F4F6;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h1>Account Deleted</h1>
            </div>
            <div class="content">
              <p>Hello ${name || "User"},</p>
              <p>This email is to confirm that your HandoverKey account has been permanently deleted as requested.</p>
              <p>All your data, including your vault secrets and successor configurations, has been removed from our systems.</p>
              <p>We're sorry to see you go. If you change your mind, you're always welcome to create a new account.</p>
              <p>Thank you for using HandoverKey.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HandoverKey. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${name || "User"},

This email is to confirm that your HandoverKey account has been permanently deleted as requested.

All your data, including your vault secrets and successor configurations, has been removed from our systems.

We're sorry to see you go. If you change your mind, you're always welcome to create a new account.

Thank you for using HandoverKey.

---
© ${new Date().getFullYear()} HandoverKey. All rights reserved.
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Account deletion email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send account deletion email:", error);
      // Don't throw here, as the account is already deleted
    }
  }

  async sendAccountDeletionSuccessorEmail(
    email: string,
    userName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "HandoverKey Account Deleted",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              background-color: #F9FAFB;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              border: 1px solid #F3F4F6;
            }
            .header {
              background-color: #ffffff;
              padding: 40px 30px 30px;
              text-align: center;
              border-bottom: 1px solid #F3F4F6;
            }
            .logo {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%);
              border-radius: 14px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 10px 15px -3px rgba(107, 114, 128, 0.2);
            }
            .logo svg {
              width: 32px;
              height: 32px;
              color: white;
            }
            .content {
              padding: 40px 30px;
              color: #374151;
            }
            h1 {
              color: #111827;
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 16px;
              text-align: center;
              letter-spacing: -0.025em;
            }
            p {
              margin-bottom: 24px;
              font-size: 16px;
              color: #4B5563;
            }
            .footer {
              background-color: #F9FAFB;
              padding: 30px;
              text-align: center;
              font-size: 13px;
              color: #6B7280;
              border-top: 1px solid #F3F4F6;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1>Account Deleted</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We are writing to inform you that <strong>${userName}</strong> has deleted their HandoverKey account.</p>
              <p>As a designated successor, you no longer have access to any potential handover information associated with this account.</p>
              <p>No action is required on your part.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HandoverKey. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello,

We are writing to inform you that ${userName} has deleted their HandoverKey account.

As a designated successor, you no longer have access to any potential handover information associated with this account.

No action is required on your part.

---
© ${new Date().getFullYear()} HandoverKey. All rights reserved.
      `.trim(),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Account deletion successor email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send account deletion successor email:", error);
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Test Email from HandoverKey",
        text: "This is a test email to verify your SMTP configuration.",
      });
      return true;
    } catch (error) {
      console.error("Test email failed:", error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("SMTP connection verified successfully");
      return true;
    } catch (error) {
      console.error("SMTP connection verification failed:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
