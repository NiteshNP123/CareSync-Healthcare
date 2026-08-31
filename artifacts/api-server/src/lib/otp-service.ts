import crypto from "node:crypto";

export interface OtpSession {
  requestId: number;
  otpCode: string;
  expiresAt: Date;
  attempts: number;
}

export interface IOtpProvider {
  generateOtp(requestId: number, recipientPhoneOrEmail: string): Promise<{ otpCode: string; expiresAt: Date }>;
  verifyOtp(requestId: number, enteredCode: string, storedCode: string, expiresAt: Date): boolean;
}

class DemoMockOtpProvider implements IOtpProvider {
  async generateOtp(_requestId: number, _recipient: string): Promise<{ otpCode: string; expiresAt: Date }> {
    // Generate secure 6-digit numeric OTP
    const randomInt = crypto.randomInt(100000, 999999);
    const otpCode = randomInt.toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // In demo environment, we return the generated code for display in test verification
    return { otpCode, expiresAt };
  }

  verifyOtp(_requestId: number, enteredCode: string, storedCode: string, expiresAt: Date): boolean {
    if (new Date() > new Date(expiresAt)) {
      return false; // Expired
    }
    // Constant time comparison to prevent timing attacks
    if (enteredCode.length !== storedCode.length) return false;
    return crypto.timingSafeEqual(Buffer.from(enteredCode), Buffer.from(storedCode));
  }
}

export const otpService: IOtpProvider = new DemoMockOtpProvider();
