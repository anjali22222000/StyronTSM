import { pool } from "../config/db.js";

export async function adminListTemplates(req, res) {
  const [rows] = await pool.query("SELECT * FROM email_templates ORDER BY id ASC");
  res.json({ success: true, data: rows });
}

export async function adminGetTemplate(req, res) {
  const { key } = req.params;
  const [rows] = await pool.query("SELECT * FROM email_templates WHERE `key` = ?", [key]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Template not found." });
  res.json({ success: true, data: rows[0] });
}

export async function adminUpdateTemplate(req, res) {
  const { key } = req.params;
  const { subject, html_body, is_active } = req.body;
  const updates = [];
  const params = [];
  if (subject !== undefined)   { updates.push("subject = ?");    params.push(subject); }
  if (html_body !== undefined) { updates.push("html_body = ?");  params.push(html_body); }
  if (is_active !== undefined) { updates.push("is_active = ?"); params.push(is_active ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update." });
  params.push(key);
  const [result] = await pool.query(
    `UPDATE email_templates SET ${updates.join(", ")} WHERE \`key\` = ?`, params
  );
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "Template not found." });
  res.json({ success: true, message: "Template updated." });
}

/** Renders a template by replacing {{variable}} tokens with provided values. */
export function renderTemplate(html, vars = {}) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/** Fetches a template from DB by key, returns { subject, html } with vars substituted. */
export async function getRenderedTemplate(key, vars = {}) {
  const [rows] = await pool.query(
    "SELECT subject, html_body FROM email_templates WHERE `key` = ? AND is_active = 1",
    [key]
  );
  if (!rows.length) return null;
  return {
    subject: renderTemplate(rows[0].subject, vars),
    html: renderTemplate(rows[0].html_body, vars),
  };
}
