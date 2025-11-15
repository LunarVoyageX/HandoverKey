export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: Uint8Array;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastActivity?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  inactivityThresholdDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistration {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserLogin {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface PasswordReset {
  email: string;
  token: string;
  newPassword: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
