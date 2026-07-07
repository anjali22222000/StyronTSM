import { pool } from "../config/db.js";

export async function listSteelPrices(req, res) {
  const [rows] = await pool.query(
    "SELECT * FROM steel_prices WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  res.json({ success: true, data: rows });
}

export async function adminListSteelPrices(req, res) {
  const [rows] = await pool.query("SELECT * FROM steel_prices ORDER BY sort_order ASC, id ASC");
  res.json({ success: true, data: rows });
}

export async function adminCreateSteelPrice(req, res) {
  const { label, price, unit = "Ton", sort_order = 0 } = req.body;
  if (!label || price == null) {
    return res.status(400).json({ success: false, message: "label and price are required." });
  }
  const [result] = await pool.query(
    "INSERT INTO steel_prices (label, price, unit, sort_order) VALUES (?, ?, ?, ?)",
    [label, price, unit, sort_order]
  );
  const [rows] = await pool.query("SELECT * FROM steel_prices WHERE id = ?", [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
}

export async function adminUpdateSteelPrice(req, res) {
  const { id } = req.params;
  const { label, price, unit, sort_order, is_active } = req.body;
  const updates = [];
  const params = [];
  if (label !== undefined)      { updates.push("label = ?");      params.push(label); }
  if (price !== undefined)      { updates.push("price = ?");      params.push(price); }
  if (unit !== undefined)       { updates.push("unit = ?");       params.push(unit); }
  if (sort_order !== undefined) { updates.push("sort_order = ?"); params.push(sort_order); }
  if (is_active !== undefined)  { updates.push("is_active = ?");  params.push(is_active ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update." });
  params.push(id);
  await pool.query(`UPDATE steel_prices SET ${updates.join(", ")} WHERE id = ?`, params);
  const [rows] = await pool.query("SELECT * FROM steel_prices WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Price not found." });
  res.json({ success: true, data: rows[0] });
}

export async function adminDeleteSteelPrice(req, res) {
  const { id } = req.params;
  const [result] = await pool.query("DELETE FROM steel_prices WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "Price not found." });
  res.json({ success: true, message: "Deleted." });
}
