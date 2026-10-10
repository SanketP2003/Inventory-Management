import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class OtpService {
  private static readonly SALT_ROUNDS = 10;
  public static readonly OTP_EXPIRY_MINUTES = 5;
  public static readonly MAX_OTP_ATTEMPTS = 5;

  /**
   * Generates a 6-digit numeric OTP.
   */
  public static generateOtp(): string {
    const min = 100000;
    const max = 999999;
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Hashes the raw OTP string using bcrypt.
   */
  public static async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, this.SALT_ROUNDS);
  }

  /**
   * Compares a raw OTP against a stored bcrypt hash.
   */
  public static async verifyOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }

  /**
   * Computes the expiry timestamp (5 minutes from now).
   */
  public static getExpiryDate(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }
}
