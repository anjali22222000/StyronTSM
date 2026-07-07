import dotenv from "dotenv";
import * as Brevo from "@getbrevo/brevo";

dotenv.config();

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sender = {
  name: process.env.MAIL_FROM_NAME || "Styron TSM",
  email: process.env.MAIL_FROM_EMAIL,
};

export async function verifyMailer() {
  console.log("✅ Brevo Email API configured.");
}

export async function sendOtpEmail({ to, name, otp, purpose }) {
  const purposeLabel =
    purpose === "register"
      ? "verify your account"
      : purpose === "reset_password"
      ? "reset your password"
      : "sign in";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2>Styron TSM</h2>

      <p>Hi ${name || "there"},</p>

      <p>Use the verification code below to ${purposeLabel}.</p>

      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;">
        ${otp}
      </div>

      <p>This code expires in ${
        process.env.OTP_EXPIRY_MINUTES || 10
      } minutes.</p>
    </div>
  `;

  await apiInstance.sendTransacEmail({
    sender,
    to: [{ email: to, name: name || "" }],
    subject: "Your Styron TSM Verification Code",
    htmlContent: html,
  });
}

export async function sendNotificationEmail({ to, subject, html }) {
  await apiInstance.sendTransacEmail({
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
}