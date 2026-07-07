import PDFDocument from "pdfkit";
import { COMPANY_INFO } from "../data/knowledgeBase.js";

const COLORS = {
  navy: "#0b1628",
  orange: "#f97316",
  steel: "#64748b",
  steelLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
};

const COMPANY = {
  name: "Styron TSM",
  tagline: "Steel Reinforcement Manufacturing",
  address: "Industrial Area, City, State 400001, India",
  phone: COMPANY_INFO.match(/Phone: ([^\n]+)/)?.[1] || "+91 12345 67890",
  email: COMPANY_INFO.match(/Email: ([^\n]+)/)?.[1] || "sales@styrontsm.com",
  gstin: "27STYR0001M1ZA",
};

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Builds a professional GST-style invoice PDF and resolves with a Buffer
 * (for email attachments or saving to disk). Used internally by streamInvoicePdf.
 */
export function buildInvoicePdf({ order, items, customerName, customerEmail, invoiceNumber, billingAddress, shippingAddress, gstin }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = 595.28, H = 841.89, L = 45, R = W - 45, CW = R - L;
    const invNo = invoiceNumber || `INV-${order.order_number.slice(-8)}`;

    // ── HEADER ─────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 100).fill(COLORS.navy);
    doc.roundedRect(L, 18, 54, 54, 5).fill(COLORS.orange);
    doc.fillColor(COLORS.white).fontSize(24).font("Helvetica-Bold").text("S", L, 30, { width: 54, align: "center" });

    doc.fillColor(COLORS.white).fontSize(17).font("Helvetica-Bold").text(COMPANY.name, L + 64, 20);
    doc.fillColor(COLORS.steelLight).fontSize(8.5).font("Helvetica")
      .text(COMPANY.tagline, L + 64, 42)
      .text(`GSTIN: ${COMPANY.gstin}`, L + 64, 54)
      .text(`${COMPANY.phone}  ·  ${COMPANY.email}`, L + 64, 66);

    doc.fillColor(COLORS.orange).fontSize(20).font("Helvetica-Bold").text("TAX INVOICE", 0, 18, { width: R, align: "right" });
    doc.fillColor(COLORS.steelLight).fontSize(8.5).font("Helvetica")
      .text(`Invoice No: ${invNo}`, 0, 46, { width: R, align: "right" })
      .text(`Order No: ${order.order_number}`, 0, 58, { width: R, align: "right" })
      .text(`Date: ${new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 0, 70, { width: R, align: "right" });

    // ── BILLING / SHIPPING ────────────────────────────────────────────
    let y = 112;
    const halfW = CW / 2 - 6;

    doc.rect(L, y, halfW, 92).fill(COLORS.bg).stroke(COLORS.border);
    doc.fillColor(COLORS.orange).fontSize(7.5).font("Helvetica-Bold").text("BILLING ADDRESS", L + 8, y + 8);
    doc.fillColor(COLORS.navy).fontSize(10).font("Helvetica-Bold").text(customerName || order.guest_name || "Customer", L + 8, y + 22);
    doc.fillColor(COLORS.steel).fontSize(8).font("Helvetica")
      .text(billingAddress || order.shipping_address || "", L + 8, y + 37, { width: halfW - 16 })
      .text(`Email: ${customerEmail || order.guest_email || "—"}`, L + 8, y + 64, { width: halfW - 16 })
      .text(`GSTIN: ${gstin || "—"}`, L + 8, y + 76, { width: halfW - 16 });

    const rx = L + halfW + 12;
    doc.rect(rx, y, halfW, 92).fill(COLORS.bg).stroke(COLORS.border);
    doc.fillColor(COLORS.orange).fontSize(7.5).font("Helvetica-Bold").text("SHIPPING ADDRESS", rx + 8, y + 8);
    doc.fillColor(COLORS.navy).fontSize(10).font("Helvetica-Bold").text(customerName || order.guest_name || "Customer", rx + 8, y + 22);
    doc.fillColor(COLORS.steel).fontSize(8).font("Helvetica")
      .text(shippingAddress || order.shipping_address || "", rx + 8, y + 37, { width: halfW - 16 })
      .text(`Status: ${String(order.status).replace("_", " ").toUpperCase()}`, rx + 8, y + 76, { width: halfW - 16 });

    y += 102;

    // ── ITEMS TABLE ─────────────────────────────────────────────────────
    const colX = { no: L, name: L + 20, qty: L + 270, unit: L + 320, rate: L + 370, tax: L + 430, amount: L + 480 };
    const hh = 20;
    doc.rect(L, y, CW, hh).fill(COLORS.navy);
    doc.fillColor(COLORS.white).fontSize(7.5).font("Helvetica-Bold")
      .text("#", colX.no, y + 6, { width: 18 })
      .text("ITEM", colX.name, y + 6, { width: 245 })
      .text("QTY", colX.qty, y + 6, { width: 45, align: "right" })
      .text("RATE", colX.rate, y + 6, { width: 55, align: "right" })
      .text("TAX", colX.tax, y + 6, { width: 45, align: "right" })
      .text("AMOUNT", colX.amount, y + 6, { width: CW - (colX.amount - L), align: "right" });
    y += hh;

    const rowH = 20;
    const gstPercent = 18;
    items.forEach((item, i) => {
      doc.rect(L, y, CW, rowH).fill(i % 2 === 0 ? COLORS.white : COLORS.bg);
      doc.fillColor(COLORS.steelLight).fontSize(8).font("Helvetica").text(String(i + 1), colX.no, y + 6, { width: 18 });
      doc.fillColor(COLORS.navy).font("Helvetica-Bold").text(item.product_name, colX.name, y + 6, { width: 245, lineBreak: false });
      doc.fillColor(COLORS.steel).font("Helvetica")
        .text(String(item.quantity), colX.qty, y + 6, { width: 45, align: "right", lineBreak: false })
        .text(money(item.unit_price), colX.rate, y + 6, { width: 55, align: "right", lineBreak: false })
        .text(`${gstPercent}%`, colX.tax, y + 6, { width: 45, align: "right", lineBreak: false });
      doc.fillColor(COLORS.navy).font("Helvetica-Bold")
        .text(money(item.line_total), colX.amount, y + 6, { width: CW - (colX.amount - L), align: "right", lineBreak: false });
      doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor(COLORS.border).lineWidth(0.4).stroke();
      y += rowH;
    });

    y += 10;

    // ── TOTALS ───────────────────────────────────────────────────────────
    const totalsW = 220;
    const totalsX = R - totalsW;
    const subtotal = Number(order.subtotal);
    const gstAmount = 0; // existing schema doesn't separately track GST; shown as 0 honestly
    const grandTotal = Number(order.total);

    doc.rect(totalsX, y, totalsW, 80).fill(COLORS.navy);
    const row = (label, val, ry, bold = false) => {
      doc.fillColor(bold ? COLORS.white : COLORS.steelLight).fontSize(bold ? 11 : 8.5)
        .font(bold ? "Helvetica-Bold" : "Helvetica").text(label, totalsX + 10, ry, { width: totalsW / 2 });
      doc.fillColor(bold ? COLORS.orange : COLORS.white).fontSize(bold ? 11 : 8.5)
        .font(bold ? "Helvetica-Bold" : "Helvetica").text(val, totalsX + totalsW / 2, ry, { width: totalsW / 2 - 10, align: "right" });
    };
    row("Subtotal", money(subtotal), y + 10);
    row("GST", money(gstAmount), y + 26);
    doc.moveTo(totalsX + 10, y + 42).lineTo(totalsX + totalsW - 10, y + 42).strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();
    row("Grand Total", money(grandTotal), y + 50, true);

    y += 100;

    // ── SIGNATURE ────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(R, y).strokeColor(COLORS.border).lineWidth(0.8).stroke();
    y += 12;
    doc.fillColor(COLORS.steel).fontSize(7.5).font("Helvetica")
      .text("This is a computer-generated invoice and does not require a physical signature.", L, y)
      .text(`For queries: ${COMPANY.email} · ${COMPANY.phone}`, L, y + 12);

    doc.fillColor(COLORS.navy).fontSize(8.5).font("Helvetica-Bold").text("For Styron TSM", R - 130, y, { width: 130, align: "center" });
    doc.moveTo(R - 120, y + 30).lineTo(R - 10, y + 30).strokeColor(COLORS.border).lineWidth(0.6).stroke();
    doc.fillColor(COLORS.steel).fontSize(7.5).font("Helvetica").text("Authorised Signatory", R - 130, y + 34, { width: 130, align: "center" });

    // ── FOOTER ───────────────────────────────────────────────────────────
    doc.rect(0, H - 24, W, 24).fill(COLORS.navy);
    doc.fillColor(COLORS.steelLight).fontSize(7).font("Helvetica")
      .text(`${COMPANY.name} · ${COMPANY.address} · GSTIN: ${COMPANY.gstin}`, 0, H - 13, { width: W, align: "center" });

    doc.end();
  });
}

/**
 * Streams an invoice PDF for the given order directly to an Express response.
 * `order` is the row from the `orders` table, `items` from `order_items`.
 * Preserved for backward compatibility with existing callers.
 */
export async function streamInvoicePdf(res, { order, items, customerName, customerEmail }) {
  const buffer = await buildInvoicePdf({ order, items, customerName, customerEmail });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.order_number}.pdf"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
}
