import crypto from "crypto";
import bcrypt from "bcryptjs";

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);

/** Generates a numeric OTP string, e.g. "493820" */
export function generateOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, "0");
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate(minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10)) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
