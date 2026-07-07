import { pool } from "../config/db.js";

/** Notifies all admins (e.g. new registration, new order, new contact query). */
export async function notifyAdmins({ type, title, body = null, link = null }) {
  await pool.query(
    `INSERT INTO notifications (audience, recipient_id, type, title, body, link)
     VALUES ('admin', NULL, ?, ?, ?, ?)`,
    [type, title, body, link]
  );
}

/** Notifies a single user (e.g. order status update, OTP verified). */
export async function notifyUser(userId, { type, title, body = null, link = null }) {
  await pool.query(
    `INSERT INTO notifications (audience, recipient_id, type, title, body, link)
     VALUES ('user', ?, ?, ?, ?, ?)`,
    [userId, type, title, body, link]
  );
}
