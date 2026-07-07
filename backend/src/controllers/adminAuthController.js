import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { generateOtp, hashOtp, compareOtp, otpExpiryDate } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { signAccessToken, hashToken, refreshExpiryDate, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/admin-auth",
};

/** Step 1: validate email+password. On success, issue an OTP rather than a session. */
export async function adminLoginStep1(req, res) {
  const { email, password } = req.body;

  const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
  const admin = rows[0];
  if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials." });

  if (admin.status === "disabled") {
    return res.status(403).json({ success: false, message: "This admin account is disabled." });
  }
  if (admin.locked_until && new Date(admin.locked_until).getTime() > Date.now()) {
    const minsLeft = Math.ceil((new Date(admin.locked_until).getTime() - Date.now()) / 60000);
    return res.status(423).json({ success: false, message: `Account locked. Try again in ${minsLeft} minute(s).` });
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    const failedAttempts = admin.failed_attempts + 1;
    const lockUpdate =
      failedAttempts >= MAX_FAILED_ATTEMPTS
        ? `, locked_until = DATE_ADD(NOW(), INTERVAL ${LOCK_DURATION_MINUTES} MINUTE)`
        : "";
    await pool.query(`UPDATE admins SET failed_attempts = ? ${lockUpdate} WHERE id = ?`, [failedAttempts, admin.id]);

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return res.status(423).json({
        success: false,
        message: `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`,
      });
    }
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  // Correct password — reset failure counter, then send 2FA OTP.
  await pool.query("UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = ?", [admin.id]);

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await pool.query(
    `INSERT INTO admin_otps (admin_id, otp_hash, expires_at, last_sent_at) VALUES (?, ?, ?, NOW())`,
    [admin.id, otpHash, otpExpiryDate()]
  );
  await sendOtpEmail({ to: admin.email, name: admin.name, otp, purpose: "login" });

  res.json({
    success: true,
    message: "Password verified. Enter the OTP sent to your email to complete login.",
    data: { adminId: admin.id, expiresInMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10) },
  });
}

/** Step 2: verify OTP, issue tokens, full dashboard access. */
export async function adminLoginStep2(req, res) {
  const { adminId, otp } = req.body;

  const [rows] = await pool.query(
    `SELECT * FROM admin_otps WHERE admin_id = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`,
    [adminId]
  );
  const record = rows[0];
  if (!record) return res.status(400).json({ success: false, message: "No pending OTP found. Please log in again." });
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "Code expired. Please log in again." });
  }
  if (record.attempts >= record.max_attempts) {
    return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please log in again." });
  }

  const isMatch = await compareOtp(otp, record.otp_hash);
  if (!isMatch) {
    await pool.query("UPDATE admin_otps SET attempts = attempts + 1 WHERE id = ?", [record.id]);
    return res.status(400).json({ success: false, message: "Incorrect code." });
  }

  const [adminRows] = await pool.query("SELECT * FROM admins WHERE id = ?", [adminId]);
  const admin = adminRows[0];

  await pool.query("UPDATE admin_otps SET consumed_at = NOW() WHERE id = ?", [record.id]);
  await pool.query("UPDATE admins SET last_login_at = NOW() WHERE id = ?", [adminId]);

  const payload = { id: admin.id, type: "admin", role: admin.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await pool.query(
    `INSERT INTO refresh_tokens (token_hash, subject_type, subject_id, expires_at) VALUES (?, 'admin', ?, ?)`,
    [hashToken(refreshToken), admin.id, refreshExpiryDate()]
  );
  res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 3600 * 1000 });

  res.json({
    success: true,
    data: { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } },
  });
}

export async function adminResendOtp(req, res) {
  const { adminId } = req.body;

  const [rows] = await pool.query(
    `SELECT * FROM admin_otps WHERE admin_id = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`,
    [adminId]
  );
  const record = rows[0];
  if (!record) return res.status(400).json({ success: false, message: "No pending OTP found." });

  const secondsSince = (Date.now() - new Date(record.last_sent_at).getTime()) / 1000;
  if (secondsSince < RESEND_COOLDOWN_SECONDS) {
    return res.status(429).json({
      success: false,
      message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before resending.`,
    });
  }

  const [adminRows] = await pool.query("SELECT * FROM admins WHERE id = ?", [adminId]);
  const admin = adminRows[0];

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await pool.query(
    "UPDATE admin_otps SET otp_hash = ?, expires_at = ?, attempts = 0, last_sent_at = NOW() WHERE id = ?",
    [otpHash, otpExpiryDate(), record.id]
  );
  await sendOtpEmail({ to: admin.email, name: admin.name, otp, purpose: "login" });
  res.json({ success: true, message: "A new code has been sent." });
}

export async function adminRefresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: "No refresh token provided." });

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
  }
  if (decoded.type !== "admin") return res.status(401).json({ success: false, message: "Invalid token type." });

  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND subject_type = 'admin' AND subject_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashToken(token), decoded.id]
  );
  if (!rows.length) return res.status(401).json({ success: false, message: "Refresh token revoked or not found." });

  const accessToken = signAccessToken({ id: decoded.id, type: "admin", role: decoded.role });
  res.json({ success: true, data: { accessToken } });
}

export async function adminLogout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?", [hashToken(token)]);
  }
  res.clearCookie("refresh_token", { path: "/api/admin-auth" });
  res.json({ success: true, message: "Logged out." });
}
