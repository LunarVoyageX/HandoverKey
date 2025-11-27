import nodemailer from "nodemailer";

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
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }

  async sendSuccessorVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify-successor?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Successor Status - HandoverKey",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HandoverKey</h1>
            </div>
            <div class="content">
              <h2>You've Been Added as a Successor</h2>
              <p>Hello,</p>
              <p>You have been designated as a successor for a HandoverKey account. This means you will receive access to encrypted digital assets in the event of the account holder's prolonged inactivity.</p>
              
              <p><strong>Important:</strong> Please verify your email address to confirm your successor status.</p>
              
              <p style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${verificationLink}
              </p>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Click the verification link above</li>
                <li>Your successor status will be confirmed</li>
                <li>You'll be notified if the handover process is initiated</li>
              </ul>
              
              <p>If you did not expect this email or believe it was sent in error, you can safely ignore it.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from HandoverKey.</p>
              <p>© ${new Date().getFullYear()} HandoverKey. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
You've Been Added as a Successor - HandoverKey

Hello,

You have been designated as a successor for a HandoverKey account. This means you will receive access to encrypted digital assets in the event of the account holder's prolonged inactivity.

Please verify your email address by clicking this link:
${verificationLink}

What happens next?
- Click the verification link above
- Your successor status will be confirmed
- You'll be notified if the handover process is initiated

If you did not expect this email or believe it was sent in error, you can safely ignore it.

© ${new Date().getFullYear()} HandoverKey. All rights reserved.
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
