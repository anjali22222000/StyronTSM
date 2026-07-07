import { pool } from "../config/db.js";
import { buildQuotationPdf } from "../utils/pdfQuotation.js";
import { sendNotificationEmail } from "../utils/mailer.js";
import { notifyAdmins } from "../utils/notifications.js";
import { streamExcel } from "../utils/excelExport.js";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: LIST / SEARCH / FILTER QUOTATIONS
// GET /api/quotations/admin/list
// ─────────────────────────────────────────────────────────────────────────────
export async function adminListQuotations(req, res) {
  const { search = "", status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(customer_name LIKE ? OR customer_email LIKE ? OR quotation_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { where.push("status = ?"); params.push(status); }
  if (dateFrom) { where.push("DATE(created_at) >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("DATE(created_at) <= ?"); params.push(dateTo); }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT * FROM quotations WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM quotations WHERE ${whereClause}`, params);

  res.json({ success: true, data: { quotations: rows, total, page: Number(page), limit: Number(limit) } });
}

export async function adminGetQuotation(req, res) {
  const { id } = req.params;
  const record = await fetchQuotationById(id);
  if (!record) return res.status(404).json({ success: false, message: "Quotation not found." });
  res.json({ success: true, data: record });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: REGENERATE QUOTATION (creates a fresh quotation with new number,
// same customer/items, resets status to draft — useful after price changes)
// POST /api/quotations/admin/:id/regenerate
// ─────────────────────────────────────────────────────────────────────────────
export async function adminRegenerateQuotation(req, res) {
  const { id } = req.params;
  const record = await fetchQuotationById(id);
  if (!record) return res.status(404).json({ success: false, message: "Quotation not found." });

  const { quotation, items } = record;
  const body = {
    customerName: quotation.customer_name,
    customerEmail: quotation.customer_email,
    customerPhone: quotation.customer_phone,
    customerCompany: quotation.customer_company,
    customerAddress: quotation.customer_address,
    customerGstin: quotation.customer_gstin,
    notes: quotation.notes,
    items: items.map((i) => ({
      name: i.product_name, grade: i.grade, qty: i.quantity, unit: i.unit, rate: i.unit_price,
    })),
  };

  const result = await createQuotationInternal(body, { type: quotation.user_id ? "user" : null, id: quotation.user_id });
  res.status(201).json({ success: true, message: "Quotation regenerated.", data: result });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: EXPORT QUOTATIONS TO EXCEL
// GET /api/quotations/admin/export
// ─────────────────────────────────────────────────────────────────────────────
export async function adminExportQuotationsExcel(req, res) {
  const { search = "", status, dateFrom, dateTo } = req.query;
  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(customer_name LIKE ? OR customer_email LIKE ? OR quotation_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { where.push("status = ?"); params.push(status); }
  if (dateFrom) { where.push("DATE(created_at) >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("DATE(created_at) <= ?"); params.push(dateTo); }

  const [rows] = await pool.query(
    `SELECT * FROM quotations WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );

  const data = rows.map((q) => ({
    number: q.quotation_number,
    customer: q.customer_name,
    email: q.customer_email,
    phone: q.customer_phone || "",
    company: q.customer_company || "",
    total: Number(q.total),
    status: q.status,
    createdOn: new Date(q.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    validUntil: q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
  }));

  await streamExcel(
    res,
    "quotations-export.xlsx",
    [
      { header: "Quotation No.", key: "number", width: 22 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Company", key: "company", width: 24 },
      { header: "Total (₹)", key: "total", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Created On", key: "createdOn", width: 16 },
      { header: "Valid Until", key: "validUntil", width: 16 },
    ],
    data,
    "Quotations"
  );
}

const fromHeader = () =>
  `${process.env.MAIL_FROM_NAME || "Styron TSM"} <${process.env.GMAIL_USER}>`;

/** Generates a quotation number like QT-20260621-A3X9 */
function generateQuotationNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `QT-${date}-${rand}`;
}

/** Valid-until = 15 days from now */
function validUntilDate() {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE QUOTATION
// POST /api/quotations
// Body: { customerName, customerEmail, customerPhone, customerCompany,
//         customerAddress, customerGstin, items: [{name, grade, qty, unit, rate}] }
// ─────────────────────────────────────────────────────────────────────────────
export async function createQuotation(req, res) {
  const {
    customerName, customerEmail, customerPhone,
    customerCompany, customerAddress, customerGstin,
    items = [], notes = "",
  } = req.body;

  if (!customerName || !customerEmail) {
    return res.status(400).json({ success: false, message: "Customer name and email are required." });
  }
  if (!items.length) {
    return res.status(400).json({ success: false, message: "At least one product item is required." });
  }

  const quotationNumber = generateQuotationNumber();
  const userId = req.auth?.type === "user" ? req.auth.id : null;

  // Re-calculate financials server-side — never trust the client's totals
  let subtotal = 0;
  const resolvedItems = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const lineTotal = qty * rate;
    subtotal += lineTotal;
    return { ...item, qty, rate, lineTotal };
  });
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO quotations
         (quotation_number, user_id, customer_name, customer_email, customer_phone,
          customer_company, customer_address, customer_gstin,
          subtotal, cgst, sgst, total, valid_until, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        quotationNumber, userId, customerName, customerEmail, customerPhone || null,
        customerCompany || null, customerAddress || null, customerGstin || null,
        subtotal, cgst, sgst, total, validUntilDate(), notes || null,
      ]
    );
    const quotationId = result.insertId;

    for (let i = 0; i < resolvedItems.length; i++) {
      const item = resolvedItems[i];
      await conn.query(
        `INSERT INTO quotation_items
           (quotation_id, product_name, grade, quantity, unit, unit_price, line_total, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, item.name, item.grade || null, item.qty, item.unit || "MT", item.rate, item.lineTotal, i]
      );
    }

    await conn.commit();

    await notifyAdmins({
      type: "new_quotation",
      title: "New quotation request",
      body: `${customerName} (${customerEmail}) — ${quotationNumber}`,
      link: `/admin/quotations/${quotationId}`,
    }).catch(() => {}); // non-fatal

    res.status(201).json({
      success: true,
      message: "Quotation created.",
      data: { quotationId, quotationNumber, total },
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET QUOTATION (used internally)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchQuotationById(id) {
  const [[quotation]] = await pool.query("SELECT * FROM quotations WHERE id = ?", [id]);
  if (!quotation) return null;
  const [items] = await pool.query(
    "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC",
    [id]
  );
  return { quotation, items };
}

async function fetchQuotationByNumber(number) {
  const [[quotation]] = await pool.query("SELECT * FROM quotations WHERE quotation_number = ?", [number]);
  if (!quotation) return null;
  const [items] = await pool.query(
    "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC",
    [quotation.id]
  );
  return { quotation, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD PDF
// GET /api/quotations/:id/pdf
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadQuotationPdf(req, res) {
  const { id } = req.params;

  const record = await fetchQuotationById(id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Quotation not found." });
  }

  const { quotation, items } = record;

  // Auth check: user can download their own; admins can download any; guests can
  // download if they supply the correct quotation_number as a query param.
  const auth = req.auth;
  const guestToken = req.query.token; // token = quotation_number for guest access
  const isOwner = auth?.type === "user" && auth.id === quotation.user_id;
  const isAdmin = auth?.type === "admin";
  const isGuestWithToken = guestToken && guestToken === quotation.quotation_number;

  if (!isOwner && !isAdmin && !isGuestWithToken) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const pdfBuffer = await buildQuotationPdf(quotation, items);
    const filename = `QUOTATION-${quotation.quotation_number}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res.status(500).json({ success: false, message: "Failed to generate PDF." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL QUOTATION PDF TO CUSTOMER
// POST /api/quotations/:id/email
// ─────────────────────────────────────────────────────────────────────────────
export async function emailQuotationPdf(req, res) {
  const { id } = req.params;

  const record = await fetchQuotationById(id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Quotation not found." });
  }

  const { quotation, items } = record;

  let pdfBuffer;
  try {
    pdfBuffer = await buildQuotationPdf(quotation, items);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return res.status(500).json({ success: false, message: "Failed to generate PDF for email." });
  }

  const filename = `QUOTATION-${quotation.quotation_number}.pdf`;
  const validTill = new Date(quotation.valid_until).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #0b1628; padding: 28px 32px; display: flex; align-items: center; gap: 16px;">
        <div style="background: #f97316; width: 44px; height: 44px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; color: white; line-height: 44px; text-align: center;">S</div>
        <div style="display: inline-block; vertical-align: middle; margin-left: 12px;">
          <div style="color: white; font-size: 20px; font-weight: 900;">Styron TSM</div>
          <div style="color: #94a3b8; font-size: 12px;">Steel Reinforcement Manufacturing</div>
        </div>
      </div>
      <div style="padding: 32px;">
        <p style="color: #0b1628; font-size: 16px; font-weight: 700; margin: 0 0 8px;">Dear ${quotation.customer_name},</p>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">
          Thank you for your enquiry. Please find your quotation attached to this email.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Quotation No.</td>
              <td style="color: #0b1628; font-size: 13px; font-weight: 700; text-align: right;">${quotation.quotation_number}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Date</td>
              <td style="color: #0b1628; font-size: 13px; text-align: right;">${new Date(quotation.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Valid Till</td>
              <td style="color: #0b1628; font-size: 13px; text-align: right;">${validTill}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-size: 13px; padding: 8px 0 4px; border-top: 1px solid #e2e8f0;">Grand Total (incl. GST)</td>
              <td style="color: #f97316; font-size: 16px; font-weight: 900; text-align: right; padding: 8px 0 4px; border-top: 1px solid #e2e8f0;">
                Rs. ${Number(quotation.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          The quotation PDF is attached to this email. Please review the terms and conditions mentioned in the document.
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          To proceed, simply reply to this email or contact us directly.
        </p>
        <div style="background: #0b1628; border-radius: 6px; padding: 16px; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            📞 +91 12345 67890 &nbsp;·&nbsp; ✉️ sales@styrontsm.com<br/>
            🌐 www.styrontsm.com &nbsp;·&nbsp; Industrial Area, City, State 400001
          </p>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          This is an automated email from Styron TSM. GSTIN: 27STYR0001M1ZA · ISO 9001:2015
        </p>
      </div>
    </div>
  `;

  try {
    await sendNotificationEmail({
      to: quotation.customer_email,
      subject: `Your Quotation from Styron TSM — ${quotation.quotation_number}`,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    // Mark as sent in DB
    await pool.query(
      "UPDATE quotations SET status = 'sent', email_sent_at = NOW() WHERE id = ?",
      [id]
    );

    console.log(`✅ Quotation email sent: ${quotation.quotation_number} → ${quotation.customer_email}`);

    res.json({
      success: true,
      message: `Quotation emailed to ${quotation.customer_email}`,
      data: { emailSentTo: quotation.customer_email },
    });
  } catch (err) {
    console.error(`❌ Quotation email failed for ${quotation.quotation_number}:`, err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send email. Please check your Gmail SMTP configuration in backend/.env.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE + AUTO-EMAIL (single endpoint for the "Generate Quotation" button)
// POST /api/quotations/generate
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAndEmail(req, res) {
  // Step 1: create
  const createdData = await createQuotationInternal(req.body, req.auth);
  const { quotationId, quotationNumber } = createdData;

  // Step 2: build PDF + email (best-effort — failure doesn't fail the create)
  let emailSent = false;
  let emailError = null;
  try {
    const record = await fetchQuotationById(quotationId);
    const pdfBuffer = await buildQuotationPdf(record.quotation, record.items);
    const filename = `QUOTATION-${quotationNumber}.pdf`;

    const validTill = new Date(record.quotation.valid_until).toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const html = buildEmailHtml(record.quotation, validTill);
await sendNotificationEmail({
  to: record.quotation.customer_email,
  subject: `Your Quotation from Styron TSM — ${quotationNumber}`,
  html,
  attachments: [
    {
      filename,
      content: pdfBuffer,
    },
  ],
});

    await pool.query("UPDATE quotations SET status = 'sent', email_sent_at = NOW() WHERE id = ?", [quotationId]);
    emailSent = true;
    console.log(`✅ Quotation email sent: ${quotationNumber} → ${record.quotation.customer_email}`);
  } catch (err) {
    emailError = err.message;
    console.error(`⚠️ Quotation created (id=${quotationId}) but email failed:`, err.message);
  }

  res.status(201).json({
    success: true,
    message: emailSent
      ? `Quotation created and emailed to ${req.body.customerEmail}.`
      : `Quotation created (${quotationNumber}). Email delivery failed — please use "Email to Customer" to retry.`,
    data: {
      quotationId,
      quotationNumber,
      total: createdData.total,
      emailSent,
      emailError: emailError || undefined,
    },
  });
}

/** Internal helper: same creation logic but returns data instead of responding */
async function createQuotationInternal(body, auth) {
  const {
    customerName, customerEmail, customerPhone,
    customerCompany, customerAddress, customerGstin,
    items = [], notes = "",
  } = body;

  if (!customerName || !customerEmail) throw Object.assign(new Error("Name and email required."), { status: 400 });
  if (!items.length) throw Object.assign(new Error("At least one item required."), { status: 400 });

  const quotationNumber = generateQuotationNumber();
  const userId = auth?.type === "user" ? auth.id : null;

  let subtotal = 0;
  const resolvedItems = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const lineTotal = qty * rate;
    subtotal += lineTotal;
    return { ...item, qty, rate, lineTotal };
  });
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO quotations
         (quotation_number, user_id, customer_name, customer_email, customer_phone,
          customer_company, customer_address, customer_gstin,
          subtotal, cgst, sgst, total, valid_until, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [quotationNumber, userId, customerName, customerEmail, customerPhone || null,
       customerCompany || null, customerAddress || null, customerGstin || null,
       subtotal, cgst, sgst, total, validUntilDate(), notes || null]
    );
    const quotationId = result.insertId;
    for (let i = 0; i < resolvedItems.length; i++) {
      const item = resolvedItems[i];
      await conn.query(
        `INSERT INTO quotation_items (quotation_id, product_name, grade, quantity, unit, unit_price, line_total, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, item.name, item.grade || null, item.qty, item.unit || "MT", item.rate, item.lineTotal, i]
      );
    }
    await conn.commit();
    return { quotationId, quotationNumber, total };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function buildEmailHtml(quotation, validTill) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #0b1628; padding: 28px 32px;">
        <span style="background: #f97316; width: 44px; height: 44px; border-radius: 8px; display: inline-block; font-size: 22px; font-weight: 900; color: white; line-height: 44px; text-align: center; vertical-align: middle;">S</span>
        <span style="color: white; font-size: 18px; font-weight: 900; vertical-align: middle; margin-left: 12px;">Styron TSM</span>
      </div>
      <div style="padding: 32px;">
        <p style="color: #0b1628; font-size: 16px; font-weight: 700;">Dear ${quotation.customer_name},</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Thank you for your enquiry. Your quotation is attached to this email.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr><td style="color: #64748b; font-size: 13px;">Quotation No.</td><td style="text-align:right; font-weight:700; color:#0b1628;">${quotation.quotation_number}</td></tr>
            <tr><td style="color: #64748b; font-size: 13px; padding-top:6px;">Valid Till</td><td style="text-align:right; color:#0b1628; padding-top:6px;">${validTill}</td></tr>
            <tr><td style="color: #64748b; font-size: 13px; padding-top:10px; border-top:1px solid #e2e8f0; padding-top:10px;">Grand Total</td>
                <td style="text-align:right; color:#f97316; font-size:16px; font-weight:900; border-top:1px solid #e2e8f0; padding-top:10px;">Rs. ${Number(quotation.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <p style="color: #64748b; font-size: 13px;">The PDF quotation is attached. Please reply to accept or for any queries.</p>
        <div style="background: #0b1628; border-radius: 6px; padding: 14px; margin-top: 20px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">📞 +91 12345 67890 · ✉️ sales@styrontsm.com</p>
        </div>
      </div>
    </div>`;
}
