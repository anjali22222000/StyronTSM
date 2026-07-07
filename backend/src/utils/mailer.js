import dotenv from "dotenv";

dotenv.config();

const sender = {
  name: process.env.MAIL_FROM_NAME || "Styron TSM",
  email: process.env.MAIL_FROM_EMAIL,
};

export async function verifyMailer() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing");
  }

  console.log("✅ Brevo Email API configured.");
}

async function sendEmail({ to, subject, html, attachments = [] }) {
  const body = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments.length) {
    body.attachment = attachments.map((file) => ({
      name: file.filename,
      content: Buffer.isBuffer(file.content)
        ? file.content.toString("base64")
        : file.content,
    }));
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
}

export async function sendOtpEmail({ to, name, otp, purpose }) {
  const purposeLabel =
    purpose === "register"
      ? "verify your account"
      : purpose === "reset_password"
      ? "reset your password"
      : "sign in";

  const html = `
    <h2>Styron TSM</h2>
    <p>Hi ${name || "there"},</p>
    <p>Use the verification code below to ${purposeLabel}.</p>
    <h1>${otp}</h1>
    <p>This code expires in ${
      process.env.OTP_EXPIRY_MINUTES || 10
    } minutes.</p>
  `;

  await sendEmail({
    to,
    subject: "Your Styron TSM Verification Code",
    html,
  });
}

export async function sendNotificationEmail({
  to,
  subject,
  html,
  attachments = [],
}) {
  await sendEmail({
    to,
    subject,
    html,
    attachments,
  });
}