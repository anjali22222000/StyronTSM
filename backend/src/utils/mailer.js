import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
console.log("SMTP USER:", process.env.SMTP_USER);

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Port 587 uses STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("✅ Brevo SMTP connected.");
  } catch (err) {
    console.error("❌ Brevo SMTP verification failed:");
    console.error(err);
    throw err;
  }
}

const fromHeader = () =>
  `${process.env.MAIL_FROM_NAME || "Styron TSM"} <${
    process.env.MAIL_FROM_EMAIL
  }>`;

/**
 * Send OTP Email
 */
export async function sendOtpEmail({ to, name, otp, purpose }) {
  const purposeLabel =
    purpose === "register"
      ? "verify your account"
      : purpose === "reset_password"
      ? "reset your password"
      : "sign in";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#1f2937;">Styron TSM</h2>

      <p>Hi ${name || "there"},</p>

      <p>
        Use the verification code below to ${purposeLabel}.
        This code expires in ${
          process.env.OTP_EXPIRY_MINUTES || 10
        } minutes.
      </p>

      <div style="
        background:#f3f4f6;
        padding:18px;
        text-align:center;
        font-size:32px;
        font-weight:bold;
        letter-spacing:8px;
        border-radius:8px;
        margin:20px 0;">
        ${otp}
      </div>

      <p style="font-size:13px;color:#666;">
        If you didn't request this code, simply ignore this email.
      </p>

      <hr>

      <p style="font-size:12px;color:#888;">
        Styron TSM
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: fromHeader(),
    to,
    subject: `Your Styron TSM Verification Code`,
    html,
  });
}

/**
 * Send General Notification Email
 */
export async function sendNotificationEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: fromHeader(),
    to,
    subject,
    html,
  });
}