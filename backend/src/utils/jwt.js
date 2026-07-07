import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// We store only a hash of the refresh token server-side (in `refresh_tokens`)
// so a leaked DB doesn't hand out usable tokens, and so we can revoke on logout.
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate() {
  const raw = process.env.JWT_REFRESH_EXPIRES || "7d";
  const match = /^(\d+)([smhd])$/.exec(raw);
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = match ? Number(match[1]) * unitMs[match[2]] : 7 * 86400000;
  return new Date(Date.now() + ms);
}
