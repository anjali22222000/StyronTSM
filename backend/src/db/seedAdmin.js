// Creates (or updates the password of) the bootstrap super_admin defined in .env.
// Usage: node src/db/seedAdmin.js
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();
import { pool } from "../config/db.js";

async function seed() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env first.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await pool.query("SELECT id FROM admins WHERE email = ?", [email]);
  if (existing.length) {
    await pool.query("UPDATE admins SET password_hash = ?, status = 'active' WHERE email = ?", [
      passwordHash,
      email,
    ]);
    console.log(`Updated existing admin: ${email}`);
  } else {
    await pool.query(
      "INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, 'super_admin')",
      ["Super Admin", email, passwordHash]
    );
    console.log(`Created super_admin: ${email}`);
  }

  console.log("Done. Change the bootstrap password after first login.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
