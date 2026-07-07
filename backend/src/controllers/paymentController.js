import { pool } from "../config/db.js";
import { streamExcel } from "../utils/excelExport.js";
import PDFDocument from "pdfkit";

function generatePaymentId() {
  return "PAY-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function adminListPayments(req, res) {
  const { status, page = 1, limit = 20, search = "" } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = ["1=1"];
  const params = [];
  if (status) { where.push("p.status = ?"); params.push(status); }
  if (search) {
    where.push("(p.customer_name LIKE ? OR p.customer_email LIKE ? OR p.payment_id LIKE ? OR p.transaction_id LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT p.*, o.order_number FROM payments p
     LEFT JOIN orders o ON o.id = p.order_id
     WHERE ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM payments p WHERE ${whereClause}`, params
  );

  // Dashboard cards
  const [[summary]] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as total_revenue,
      COALESCE(SUM(CASE WHEN status='paid' AND DATE(paid_at)=CURDATE() THEN amount ELSE 0 END),0) as today_revenue,
      COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status='paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status='failed' THEN 1 END) as failed_count,
      COUNT(CASE WHEN status='refunded' THEN 1 END) as refunded_count
     FROM payments`
  );

  res.json({
    success: true,
    data: { payments: rows, total, page: Number(page), limit: Number(limit), summary },
  });
}

export async function adminGetPayment(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT p.*, o.order_number FROM payments p
     LEFT JOIN orders o ON o.id = p.order_id WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: "Payment not found." });
  res.json({ success: true, data: rows[0] });
}

export async function adminCreatePayment(req, res) {
  const { order_id, customer_name, customer_email, amount, payment_method, gateway, transaction_id, status = "pending", notes } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: "amount is required." });
  const payment_id = generatePaymentId();
  const paid_at = status === "paid" ? new Date() : null;
  const [result] = await pool.query(
    `INSERT INTO payments (payment_id, order_id, customer_name, customer_email, amount, payment_method, gateway, transaction_id, status, notes, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payment_id, order_id || null, customer_name || null, customer_email || null, amount, payment_method || null, gateway || "Manual", transaction_id || null, status, notes || null, paid_at]
  );
  const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
}

export async function adminUpdatePaymentStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;
  const valid = ["pending", "paid", "failed", "refunded"];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }
  const paid_at = status === "paid" ? new Date() : null;
  const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Payment not found." });

  await pool.query(
    "UPDATE payments SET status = ?, paid_at = COALESCE(paid_at, ?), notes = COALESCE(?, notes) WHERE id = ?",
    [status, paid_at, notes || null, id]
  );
  res.json({ success: true, message: "Payment status updated." });
}

export async function adminExportPaymentsPdf(req, res) {
  const { status } = req.query;
  const where = status ? "WHERE p.status = ?" : "";
  const params = status ? [status] : [];
  const [rows] = await pool.query(
    `SELECT p.payment_id, o.order_number, p.customer_name, p.amount, p.payment_method,
            p.gateway, p.status, p.created_at
     FROM payments p LEFT JOIN orders o ON o.id = p.order_id ${where}
     ORDER BY p.created_at DESC`,
    params
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="payments-export.pdf"');

  const doc = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
  doc.pipe(res);

  doc.fontSize(16).font("Helvetica-Bold").fillColor("#0b1628").text("Styron TSM — Payments Report");
  doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Generated: ${new Date().toLocaleString("en-IN")}`);
  doc.moveDown(1);

  const colWidths = [120, 100, 130, 90, 90, 80, 70, 90];
  const headers = ["Payment ID", "Order #", "Customer", "Amount", "Method", "Gateway", "Status", "Date"];
  let y = doc.y;
  const startX = doc.x;

  function drawRow(values, opts = {}) {
    let x = startX;
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(opts.color || "#0b1628");
    values.forEach((v, i) => { doc.text(String(v), x, y, { width: colWidths[i], ellipsis: true }); x += colWidths[i]; });
  }

  doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 18).fill("#0b1628");
  drawRow(headers, { bold: true, color: "#ffffff" });
  y += 18;

  rows.forEach((p, idx) => {
    if (y > 540) { doc.addPage({ layout: "landscape" }); y = doc.y; }
    if (idx % 2 === 0) doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 16).fill("#f8fafc");
    drawRow([
      p.payment_id, p.order_number || "—", p.customer_name || "—",
      `Rs.${Number(p.amount).toLocaleString("en-IN")}`, p.payment_method || "—", p.gateway || "—",
      p.status, new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    ]);
    y += 16;
  });

  doc.end();
}

export async function adminExportPaymentsExcel(req, res) {
  const { status } = req.query;
  const where = status ? "WHERE p.status = ?" : "";
  const params = status ? [status] : [];
  const [rows] = await pool.query(
    `SELECT p.payment_id, o.order_number, p.customer_name, p.customer_email,
            p.amount, p.payment_method, p.gateway, p.transaction_id,
            p.status, p.paid_at, p.created_at
     FROM payments p LEFT JOIN orders o ON o.id = p.order_id ${where}
     ORDER BY p.created_at DESC`,
    params
  );

  const data = rows.map((p) => ({
    paymentId: p.payment_id,
    orderNumber: p.order_number || "",
    customer: p.customer_name || "",
    email: p.customer_email || "",
    amount: Number(p.amount),
    method: p.payment_method || "",
    gateway: p.gateway || "",
    transactionId: p.transaction_id || "",
    status: p.status,
    paidOn: p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    createdOn: new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }));

  await streamExcel(
    res,
    "payments-export.xlsx",
    [
      { header: "Payment ID", key: "paymentId", width: 24 },
      { header: "Order Number", key: "orderNumber", width: 20 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Email", key: "email", width: 26 },
      { header: "Amount (₹)", key: "amount", width: 14 },
      { header: "Method", key: "method", width: 16 },
      { header: "Gateway", key: "gateway", width: 16 },
      { header: "Transaction ID", key: "transactionId", width: 22 },
      { header: "Status", key: "status", width: 12 },
      { header: "Paid On", key: "paidOn", width: 16 },
      { header: "Created On", key: "createdOn", width: 16 },
    ],
    data,
    "Payments"
  );
}
