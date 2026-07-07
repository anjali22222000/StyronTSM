import { pool } from "../config/db.js";
import { generateOtp, hashOtp, compareOtp, otpExpiryDate } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshExpiryDate,
} from "../utils/jwt.js";
import { notifyAdmins } from "../utils/notifications.js";

const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
};

function nameFromEmail(email) {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Passwordless flow, step 1: send an OTP to the given email.
 * Works identically whether the email belongs to a new or returning user —
 * the account is created (or just logged in) at verification time.
 */
export async function requestOtp(req, res) {
  const { email } = req.body;

  const [recent] = await pool.query(
    `SELECT last_sent_at FROM otp_verifications WHERE email = ? ORDER BY id DESC LIMIT 1`,
    [email]
  );
  if (recent.length) {
    const secondsSince = (Date.now() - new Date(recent[0].last_sent_at).getTime()) / 1000;
    if (secondsSince < RESEND_COOLDOWN_SECONDS) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another code.`,
      });
    }
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await pool.query(
    `INSERT INTO otp_verifications (email, otp_hash, purpose, expires_at, last_sent_at)
     VALUES (?, ?, 'login', ?, NOW())`,
    [email, otpHash, otpExpiryDate()]
  );

  await sendOtpEmail({ to: email, name: nameFromEmail(email), otp, purpose: "login" });

  res.json({
    success: true,
    message: "Verification code sent to your email.",
    data: { email, expiresInMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10) },
  });
}

/** Step 2: verify the OTP. Creates the user on first verification, logs them in either way. */
export async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  const [rows] = await pool.query(
    `SELECT * FROM otp_verifications
     WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [email]
  );
  const record = rows[0];
  if (!record) {
    return res.status(400).json({ success: false, message: "No pending code found. Please request a new one." });
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "Code expired. Please request a new one." });
  }
  if (record.attempts >= record.max_attempts) {
    return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please request a new code." });
  }

  const isMatch = await compareOtp(otp, record.otp_hash);
  if (!isMatch) {
    await pool.query("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?", [record.id]);
    return res.status(400).json({ success: false, message: "Incorrect code. Please try again." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE otp_verifications SET consumed_at = NOW() WHERE id = ?", [record.id]);

    const [existing] = await conn.query("SELECT * FROM users WHERE email = ?", [email]);
    let user = existing[0];
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const [result] = await conn.query(
        "INSERT INTO users (name, email, is_verified) VALUES (?, ?, 1)",
        [nameFromEmail(email), email]
      );
      const [created] = await conn.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = created[0];
    } else if (user.status === "suspended") {
      throw httpError(403, "This account has been suspended.");
    } else if (!user.is_verified) {
      await conn.query("UPDATE users SET is_verified = 1 WHERE id = ?", [user.id]);
      user.is_verified = 1;
    }

    const { accessToken, refreshToken } = await issueTokens(conn, "user", user.id);
    await conn.commit();

    res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 3600 * 1000 });

    if (isNewUser) {
      await notifyAdmins({
        type: "new_registration",
        title: "New user registered",
        body: `${user.name} (${email})`,
        link: `/admin/users`,
      });
    }

    res.json({
      success: true,
      message: isNewUser ? "Account created and verified." : "Signed in successfully.",
      data: {
        accessToken,
        isNewUser,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      },
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function resendOtp(req, res) {
  const { email } = req.body;

  const [rows] = await pool.query(
    `SELECT * FROM otp_verifications WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`,
    [email]
  );
  const record = rows[0];
  if (!record) {
    // No pending OTP — treat like a fresh request rather than erroring, since the
    // frontend's "Resend" button can't always tell the difference.
    return requestOtp(req, res);
  }

  const secondsSince = (Date.now() - new Date(record.last_sent_at).getTime()) / 1000;
  if (secondsSince < RESEND_COOLDOWN_SECONDS) {
    return res.status(429).json({
      success: false,
      message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before resending.`,
    });
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await pool.query(
    "UPDATE otp_verifications SET otp_hash = ?, expires_at = ?, attempts = 0, last_sent_at = NOW() WHERE id = ?",
    [otpHash, otpExpiryDate(), record.id]
  );
  await sendOtpEmail({ to: email, name: nameFromEmail(email), otp, purpose: "login" });
  res.json({ success: true, message: "A new code has been sent." });
}

export async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: "No refresh token provided." });

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
  }

  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = ? AND subject_type = ? AND subject_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash, decoded.type, decoded.id]
  );
  if (!rows.length) return res.status(401).json({ success: false, message: "Refresh token revoked or not found." });

  const accessToken = signAccessToken({ id: decoded.id, type: decoded.type, role: decoded.role });
  res.json({ success: true, data: { accessToken } });
}

export async function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?", [hashToken(token)]);
  }
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.json({ success: true, message: "Logged out." });
}

async function issueTokens(conn, type, id, role = null) {
  const payload = { id, type, ...(role ? { role } : {}) };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await conn.query(
    `INSERT INTO refresh_tokens (token_hash, subject_type, subject_id, expires_at) VALUES (?, ?, ?, ?)`,
    [hashToken(refreshToken), type, id, refreshExpiryDate()]
  );

  return { accessToken, refreshToken };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
