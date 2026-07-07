import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
});

export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP connected.");
  } catch (err) {
    console.error("========== SMTP ERROR ==========");
    console.error(err);
    console.error("================================");
    throw err;
  }
}

const fromHeader = () =>
  `${process.env.MAIL_FROM_NAME || "Styron TSM"} <${process.env.GMAIL_USER}>`;

export async function sendOtpEmail({ to, name, otp, purpose }) {
  const purposeLabel =
    purpose === "register"
      ? "verify your account"
      : purpose === "reset_password"
      ? "reset your password"
      : "sign in";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color:#1f2937;">Styron TSM</h2>

      <p>Hi ${name || "there"},</p>

      <p>
        Use the code below to ${purposeLabel}. This code expires in
        ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.
      </p>

      <div style="
        font-size:32px;
        font-weight:bold;
        letter-spacing:6px;
        background:#f3f4f6;
        padding:16px;
        text-align:center;
        border-radius:6px;
        margin:16px 0;">
        ${otp}
      </div>

      <p style="color:#6b7280;font-size:13px;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: fromHeader(),
    to,
    subject: `Your Styron TSM verification code: ${otp}`,
    html,
  });
}

export async function sendNotificationEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: fromHeader(),
    to,
    subject,
    html,
  });
}