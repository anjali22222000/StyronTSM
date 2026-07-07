import { pool } from "../config/db.js";
import { notifyAdmins } from "../utils/notifications.js";
import { sendNotificationEmail } from "../utils/mailer.js";

export async function submitContact(req, res) {
  const { name, email, phone, message } = req.body;

  const [result] = await pool.query(
    "INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)",
    [name, email, phone || null, message]
  );

  await notifyAdmins({
    type: "new_contact",
    title: "New contact inquiry",
    body: `From ${name} (${email})`,
    link: `/admin/contacts/${result.insertId}`,
  });

  res.status(201).json({ success: true, message: "Your message has been received. We'll get back to you soon." });
}

export async function adminListContacts(req, res) {
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const where = ["1=1"];
  const params = [];
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (search) {
    where.push("(name LIKE ? OR email LIKE ? OR message LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT * FROM contacts WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM contacts WHERE ${whereClause}`, params);

  res.json({ success: true, data: { contacts: rows, total, page: Number(page), limit: Number(limit) } });
}

export async function adminReplyContact(req, res) {
  const { id } = req.params;
  const { reply } = req.body;

  const [rows] = await pool.query("SELECT * FROM contacts WHERE id = ?", [id]);
  const contact = rows[0];
  if (!contact) return res.status(404).json({ success: false, message: "Inquiry not found." });

  await pool.query(
    `UPDATE contacts SET admin_reply = ?, status = 'replied', replied_at = NOW(), replied_by_admin_id = ? WHERE id = ?`,
    [reply, req.auth.id, id]
  );

  await sendNotificationEmail({
    to: contact.email,
    subject: "Re: Your inquiry to Styron TSM",
    html: `<p>Hi ${contact.name},</p><p>${reply}</p><hr/><p style="color:#888;font-size:12px;">Your original message: "${contact.message}"</p>`,
  });

  res.json({ success: true, message: "Reply sent." });
}

export async function adminDeleteContact(req, res) {
  const { id } = req.params;
  const [result] = await pool.query("DELETE FROM contacts WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "Inquiry not found." });
  res.json({ success: true, message: "Inquiry deleted." });
}
