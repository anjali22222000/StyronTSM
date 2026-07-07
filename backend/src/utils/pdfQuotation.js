import PDFDocument from "pdfkit";

const C = {
  navy:       "#0b1628",
  orange:     "#f97316",
  steel:      "#64748b",
  steelLight: "#94a3b8",
  border:     "#e2e8f0",
  bg:         "#f8fafc",
  white:      "#ffffff",
};

const COMPANY = {
  name:    "Styron TSM",
  tagline: "Steel Reinforcement Manufacturing",
  address: "Industrial Area, City, State 400001, India",
  phone:   "+91 12345 67890",
  email:   "sales@styrontsm.com",
  gstin:   "27STYR0001M1ZA",
  cin:     "ISO 9001:2015 · BIS Certified",
};

const TERMS = [
  "Prices valid for 15 days from quotation date.",
  "GST @ 18% included (CGST 9% + SGST 9%).",
  "50% advance required, balance before dispatch.",
  "Delivery: 3–5 working days from order confirmation.",
  "Subject to stock availability at time of order.",
  "Mill Test Certificate (MTC) provided with every order.",
  "F.O.R. Destination pricing. Unloading by customer.",
  "Bank details available on request.",
];

function rupees(n) {
  return `Rs. ${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function inWords(n) {
  n = Math.round(Number(n));
  if (!n) return "Zero";
  const cr = Math.floor(n / 10000000);
  const lk = Math.floor((n % 10000000) / 100000);
  const th = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (cr) parts.push(`${cr} Crore`);
  if (lk) parts.push(`${lk} Lakh`);
  if (th) parts.push(`${th} Thousand`);
  if (rest) parts.push(`${rest}`);
  return parts.join(" ") || "Zero";
}

export function buildQuotationPdf(quot, items) {
  return new Promise((resolve, reject) => {
    // NO bufferPages — single-page document, we design to fit
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = 595.28;  // A4 width
    const H = 841.89;  // A4 height
    const L = 45;      // left margin
    const R = W - 45;  // right margin
    const CW = R - L;  // content width

    // ── HEADER ─────────────────────────────────────────────────────
    doc.rect(0, 0, W, 100).fill(C.navy);

    // Logo
    doc.roundedRect(L, 18, 54, 54, 5).fill(C.orange);
    doc.fillColor(C.white).fontSize(24).font("Helvetica-Bold")
      .text("S", L, 30, { width: 54, align: "center" });

    // Company info
    doc.fillColor(C.white).fontSize(17).font("Helvetica-Bold").text(COMPANY.name, L + 64, 20);
    doc.fillColor(C.steelLight).fontSize(8.5).font("Helvetica")
      .text(COMPANY.tagline, L + 64, 42)
      .text(`GSTIN: ${COMPANY.gstin} · ${COMPANY.cin}`, L + 64, 54)
      .text(`${COMPANY.phone}  ·  ${COMPANY.email}`, L + 64, 66);

    // "QUOTATION" right side
    doc.fillColor(C.orange).fontSize(20).font("Helvetica-Bold")
      .text("QUOTATION", 0, 22, { width: R, align: "right" });
    doc.fillColor(C.steelLight).fontSize(8.5).font("Helvetica")
      .text(`No: ${quot.quotation_number}`, 0, 50, { width: R, align: "right" })
      .text(`Date: ${new Date(quot.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 0, 62, { width: R, align: "right" })
      .text(`Valid till: ${new Date(quot.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 0, 74, { width: R, align: "right" });

    // ── BILL TO / FROM ──────────────────────────────────────────────
    let y = 112;
    const halfW = CW / 2 - 6;

    doc.rect(L, y, halfW, 88).fill(C.bg).stroke(C.border);
    doc.fillColor(C.orange).fontSize(7.5).font("Helvetica-Bold").text("BILL TO", L + 8, y + 8);
    doc.fillColor(C.navy).fontSize(10).font("Helvetica-Bold").text(quot.customer_name, L + 8, y + 22);
    doc.fillColor(C.steel).fontSize(8).font("Helvetica")
      .text(quot.customer_company || "", L + 8, y + 37, { width: halfW - 16 })
      .text(quot.customer_address || "", L + 8, y + 49, { width: halfW - 16 })
      .text(`Ph: ${quot.customer_phone || "—"}  ·  GSTIN: ${quot.customer_gstin || "—"}`, L + 8, y + 72, { width: halfW - 16 });

    const rx = L + halfW + 12;
    doc.rect(rx, y, halfW, 88).fill(C.bg).stroke(C.border);
    doc.fillColor(C.orange).fontSize(7.5).font("Helvetica-Bold").text("FROM", rx + 8, y + 8);
    doc.fillColor(C.navy).fontSize(10).font("Helvetica-Bold").text(COMPANY.name, rx + 8, y + 22);
    doc.fillColor(C.steel).fontSize(8).font("Helvetica")
      .text(COMPANY.tagline, rx + 8, y + 37)
      .text(COMPANY.address, rx + 8, y + 49)
      .text(`Ph: ${COMPANY.phone}`, rx + 8, y + 61)
      .text(`Email: ${COMPANY.email}`, rx + 8, y + 73);

    y += 98;

    // ── ITEMS TABLE ─────────────────────────────────────────────────
    const colX = { no: L, name: L + 20, grade: L + 200, qty: L + 280, unit: L + 318, rate: L + 362, amount: L + 420 };
    const hh = 20; // header height
    doc.rect(L, y, CW, hh).fill(C.navy);
    doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold")
      .text("#",            colX.no,     y + 6, { width: 18 })
      .text("DESCRIPTION",  colX.name,   y + 6, { width: 175 })
      .text("GRADE",        colX.grade,  y + 6, { width: 75 })
      .text("QTY",          colX.qty,    y + 6, { width: 35, align: "right" })
      .text("UNIT",         colX.unit,   y + 6, { width: 38, align: "center" })
      .text("RATE",         colX.rate,   y + 6, { width: 52, align: "right" })
      .text("AMOUNT",       colX.amount, y + 6, { width: CW - (colX.amount - L), align: "right" });
    y += hh;

    const rowH = 20;
    items.forEach((item, i) => {
      doc.rect(L, y, CW, rowH).fill(i % 2 === 0 ? C.white : C.bg);
      doc.fillColor(C.steelLight).fontSize(8).font("Helvetica")
        .text(String(i + 1), colX.no, y + 6, { width: 18 });
      doc.fillColor(C.navy).font("Helvetica-Bold")
        .text(item.product_name, colX.name, y + 6, { width: 175, lineBreak: false });
      doc.fillColor(C.steel).font("Helvetica")
        .text(item.grade || "—",    colX.grade,  y + 6, { width: 75,  lineBreak: false })
        .text(String(Number(item.quantity).toLocaleString("en-IN")), colX.qty, y + 6, { width: 35, align: "right", lineBreak: false })
        .text(item.unit,            colX.unit,   y + 6, { width: 38,  align: "center", lineBreak: false })
        .text(rupees(item.unit_price), colX.rate, y + 6, { width: 52, align: "right", lineBreak: false });
      doc.fillColor(C.navy).font("Helvetica-Bold")
        .text(rupees(item.line_total), colX.amount, y + 6, { width: CW - (colX.amount - L), align: "right", lineBreak: false });
      doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor(C.border).lineWidth(0.4).stroke();
      y += rowH;
    });

    y += 8;

    // ── TOTALS + TERMS ──────────────────────────────────────────────
    const termsW = CW * 0.52;
    const totalsX = L + termsW + 8;
    const totalsW = CW - termsW - 8;
    const blockY = y;
    const blockH = 120;

    // Terms box
    doc.rect(L, blockY, termsW, blockH).fill(C.bg).stroke(C.border);
    doc.fillColor(C.navy).fontSize(8.5).font("Helvetica-Bold").text("TERMS & CONDITIONS", L + 8, blockY + 8);
    doc.fillColor(C.steel).fontSize(7.5).font("Helvetica");
    TERMS.forEach((t, i) => {
      doc.text(`${i + 1}. ${t}`, L + 8, blockY + 22 + i * 12, { width: termsW - 16, lineBreak: false });
    });

    // Totals box
    doc.rect(totalsX, blockY, totalsW, blockH).fill(C.navy);
    const row = (label, val, ry, bold = false) => {
      doc.fillColor(bold ? C.white : C.steelLight).fontSize(bold ? 11 : 8.5)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(label, totalsX + 8, ry, { width: totalsW / 2 - 8 });
      doc.fillColor(bold ? C.orange : C.white).fontSize(bold ? 11 : 8.5)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(val, totalsX + totalsW / 2, ry, { width: totalsW / 2 - 8, align: "right" });
    };
    row("Taxable Amount", rupees(quot.subtotal), blockY + 10);
    row("CGST @ 9%",      rupees(quot.cgst),     blockY + 25);
    row("SGST @ 9%",      rupees(quot.sgst),     blockY + 40);
    doc.moveTo(totalsX + 8, blockY + 56).lineTo(totalsX + totalsW - 8, blockY + 56)
      .strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();
    row("Grand Total", rupees(quot.total), blockY + 62, true);
    doc.fillColor(C.steelLight).fontSize(7).font("Helvetica")
      .text(`In Words: ${inWords(quot.total)} Rupees Only`, totalsX + 8, blockY + 84, { width: totalsW - 16 })
      .text("(Inclusive of all taxes)", totalsX + 8, blockY + 96, { width: totalsW - 16 });

    y = blockY + blockH + 10;

    // ── SIGNATURE ──────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(R, y).strokeColor(C.border).lineWidth(0.8).stroke();
    y += 10;

    doc.fillColor(C.steel).fontSize(7.5).font("Helvetica")
      .text("This is a computer-generated quotation.", L, y)
      .text(`For queries: ${COMPANY.email} · ${COMPANY.phone}`, L, y + 12);

    doc.fillColor(C.navy).fontSize(8.5).font("Helvetica-Bold")
      .text("For Styron TSM", R - 120, y, { width: 120, align: "center" });
    doc.moveTo(R - 110, y + 26).lineTo(R - 10, y + 26).strokeColor(C.border).lineWidth(0.6).stroke();
    doc.fillColor(C.steel).fontSize(7.5).font("Helvetica")
      .text("Authorised Signatory", R - 120, y + 30, { width: 120, align: "center" });

    // ── FOOTER BAND (drawn at fixed page bottom, before end()) ──────
    doc.rect(0, H - 24, W, 24).fill(C.navy);
    doc.fillColor(C.steelLight).fontSize(7).font("Helvetica")
      .text(
        `${COMPANY.name} · ${COMPANY.address} · GSTIN: ${COMPANY.gstin}`,
        0, H - 13, { width: W, align: "center" }
      );

    doc.end();
  });
}

