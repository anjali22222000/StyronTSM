import { pool } from "../config/db.js";

export async function listAdminNotifications(req, res) {
  const { unreadOnly } = req.query;
  const where = unreadOnly === "true" ? "AND is_read = 0" : "";
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE audience = 'admin' ${where} ORDER BY created_at DESC LIMIT 100`
  );
  const [[{ unread }]] = await pool.query(
    "SELECT COUNT(*) as unread FROM notifications WHERE audience = 'admin' AND is_read = 0"
  );
  res.json({ success: true, data: { notifications: rows, unread } });
}

export async function listUserNotifications(req, res) {
  const { unreadOnly } = req.query;
  const where = unreadOnly === "true" ? "AND is_read = 0" : "";
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE audience = 'user' AND recipient_id = ? ${where} ORDER BY created_at DESC LIMIT 100`,
    [req.auth.id]
  );
  const [[{ unread }]] = await pool.query(
    "SELECT COUNT(*) as unread FROM notifications WHERE audience = 'user' AND recipient_id = ? AND is_read = 0",
    [req.auth.id]
  );
  res.json({ success: true, data: { notifications: rows, unread } });
}

export async function markNotificationRead(req, res) {
  const { id } = req.params;
  await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  res.json({ success: true });
}

export async function markAllNotificationsRead(req, res) {
  const audience = req.auth.type === "admin" ? "admin" : "user";
  const params = audience === "admin" ? [] : [req.auth.id];
  const where = audience === "admin" ? "audience = 'admin'" : "audience = 'user' AND recipient_id = ?";
  await pool.query(`UPDATE notifications SET is_read = 1 WHERE ${where}`, params);
  res.json({ success: true });
}
