import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the root .env file
const envPath = path.resolve(__dirname, "../.env");
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function verifyEmailConfig() {
  console.log("Testing Email Configuration...");
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  // Mask password
  const pass = process.env.SMTP_PASS || "";
  console.log(
    `Pass: ${pass.substring(0, 3)}...${pass.substring(pass.length - 3)}`,
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Verifying connection...");
    await transporter.verify();
    console.log("✅ SMTP Connection successful!");
  } catch (error) {
    console.error("❌ SMTP Connection failed:");
    console.error(error);
  }
}

verifyEmailConfig();
