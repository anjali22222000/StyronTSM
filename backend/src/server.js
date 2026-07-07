import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { testConnection } from "./config/db.js";
import { verifyMailer } from "./utils/mailer.js";

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await testConnection();
    console.log("✅ MySQL connected.");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("   Check DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in .env, and that you ran `npm run migrate`.");
    process.exit(1);
  }

  try {
    await verifyMailer();
    console.log("✅ Gmail SMTP connected.");
  } catch (err) {
    console.error("⚠️  Gmail SMTP verification failed:", err.message);
    console.error("   OTP emails will not send until GMAIL_USER / GMAIL_APP_PASSWORD are fixed.");
    // Not fatal — server still starts so the rest of the app stays usable.
  }

  app.listen(PORT, () => {
    console.log(`🚀 Styron TSM backend listening on http://localhost:${PORT}`);
  });
}

start();
