import { pool } from "../config/db.js";
import { streamExcel } from "../utils/excelExport.js";

export async function adminExportUsersExcel(req, res) {
  const { search = "" } = req.query;
  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [rows] = await pool.query(
    `SELECT name, email, phone, company, gstin, address, created_at FROM users
     WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );

  const data = rows.map((u) => ({
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    company: u.company || "",
    gstin: u.gstin || "",
    address: u.address || "",
    registeredOn: new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }));

  await streamExcel(
    res,
    "users-export.xlsx",
    [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 28 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Company", key: "company", width: 25 },
      { header: "GST", key: "gstin", width: 20 },
      { header: "Address", key: "address", width: 35 },
      { header: "Registration Date", key: "registeredOn", width: 18 },
    ],
    data,
    "Users"
  );
}

export async function adminListUsers(req, res) {
  const { search = "", status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT id, name, email, phone, is_verified, status, created_at FROM users
     WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`, params);

  res.json({ success: true, data: { users: rows, total, page: Number(page), limit: Number(limit) } });
}

export async function adminGetUser(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, is_verified, status, created_at FROM users WHERE id = ?",
    [id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: "User not found." });
  const [orders] = await pool.query("SELECT id, order_number, status, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC", [id]);
  res.json({ success: true, data: { user: rows[0], orders } });
}

export async function adminUpdateUser(req, res) {
  const { id } = req.params;
  const fields = ["name", "phone"];
  const updates = [];
  const params = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update." });
  params.push(id);
  const [result] = await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, message: "User updated." });
}

export async function adminUpdateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be 'active' or 'suspended'." });
  }
  const [result] = await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "User not found." });
  // Suspension should also kill any active sessions immediately.
  if (status === "suspended") {
    await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE subject_type = 'user' AND subject_id = ? AND revoked_at IS NULL", [id]);
  }
  res.json({ success: true, message: `User ${status === "suspended" ? "suspended" : "reactivated"}.` });
}

export async function adminDeleteUser(req, res) {
  const { id } = req.params;
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, message: "User deleted." });
}
