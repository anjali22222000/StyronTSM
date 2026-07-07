import { pool } from "../config/db.js";
import { generateOrderNumber } from "../utils/slug.js";
import { notifyAdmins, notifyUser } from "../utils/notifications.js";
import { sendNotificationEmail } from "../utils/mailer.js";
import { transporter } from "../utils/mailer.js";
import { streamInvoicePdf, buildInvoicePdf } from "../utils/pdfInvoice.js";
import { getRenderedTemplate } from "./emailTemplateController.js";

const fromHeader = () =>
  `${process.env.MAIL_FROM_NAME || "Styron TSM"} <${process.env.GMAIL_USER}>`;

function generateInvoiceNumber(orderNumber) {
  return `INV-${orderNumber.slice(-8)}-${Date.now().toString().slice(-4)}`;
}

/** Generates the invoice PDF, stores a record, and emails it to the customer.
 *  Best-effort: failures are logged but never block the order status update. */
async function autoGenerateAndEmailInvoice(order) {
  try {
    const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
    const customerName = order.guest_name || order.user_name || "Customer";
    const customerEmail = order.guest_email || order.user_email;
    if (!customerEmail) return;

    const invoiceNumber = generateInvoiceNumber(order.order_number);
    const pdfBuffer = await buildInvoicePdf({
      order, items, customerName, customerEmail, invoiceNumber,
      billingAddress: order.shipping_address, shippingAddress: order.shipping_address,
    });

    await pool.query(
      "INSERT INTO invoices (invoice_number, order_id) VALUES (?, ?)",
      [invoiceNumber, order.id]
    );

    const template = await getRenderedTemplate("invoice_email", {
      customer_name: customerName,
      order_number: order.order_number,
      invoice_number: invoiceNumber,
      total: Number(order.total).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    });

    if (template) {
      await transporter.sendMail({
        from: fromHeader(),
        to: customerEmail,
        subject: template.subject,
        html: template.html,
        attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
      });
      await pool.query("UPDATE invoices SET emailed_at = NOW() WHERE invoice_number = ?", [invoiceNumber]);
    }
  } catch (err) {
    console.error(`⚠️ Auto-invoice failed for order ${order.order_number}:`, err.message);
  }
}

const STATUS_FLOW = ["placed", "processing", "manufacturing", "quality_check", "dispatched", "delivered"];

// ---------------------------------------------------------------
// CUSTOMER / GUEST
// ---------------------------------------------------------------

/** Places an order. Works for logged-in users (req.auth set by optionalAuth) or guests. */
export async function createOrder(req, res) {
  const { items, shippingAddress, guestName, guestEmail, guestPhone } = req.body;
  const userId = req.auth?.type === "user" ? req.auth.id : null;

  if (!userId && (!guestName || !guestEmail || !guestPhone)) {
    return res.status(400).json({
      success: false,
      message: "Guest checkout requires guestName, guestEmail, and guestPhone.",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Re-price server-side from the DB — never trust client-submitted prices.
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const [rows] = await conn.query("SELECT * FROM products WHERE id = ? AND status = 'active'", [
        item.productId,
      ]);
      const product = rows[0];
      if (!product) throw httpError(400, `Product ${item.productId} is unavailable.`);
      if (product.stock_quantity < item.quantity) {
        throw httpError(400, `Insufficient stock for "${product.name}".`);
      }
      const lineTotal = Number(product.price) * item.quantity;
      subtotal += lineTotal;
      resolvedItems.push({ product, quantity: item.quantity, lineTotal });
    }

    const orderNumber = generateOrderNumber();
    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, user_id, guest_name, guest_email, guest_phone, shipping_address, subtotal, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'placed')`,
      [orderNumber, userId, userId ? null : guestName, userId ? null : guestEmail, userId ? null : guestPhone, shippingAddress, subtotal, subtotal]
    );
    const orderId = orderResult.insertId;

    for (const { product, quantity, lineTotal } of resolvedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, product.id, product.name, product.price, quantity, lineTotal]
      );
      await conn.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [
        quantity,
        product.id,
      ]);
    }

    await conn.query(`INSERT INTO order_tracking (order_id, status, note) VALUES (?, 'placed', 'Order placed.')`, [
      orderId,
    ]);

    await conn.commit();

await pool.query(
  `INSERT INTO payments (
    payment_id,
    order_id,
    customer_name,
    customer_email,
    amount,
    payment_method,
    gateway,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "PAY-" + Date.now(),
    orderId,
    userId ? null : guestName,
    userId ? null : guestEmail,
    subtotal,
    "Pending",
    "Manual",
    "pending",
  ]
);


    if (userId) {
      await notifyUser(userId, {
        type: "order_status",
        title: "Order placed successfully",
        body: `Your order ${orderNumber} has been received.`,
        link: `/account/orders`,
      });
    }
    await notifyAdmins({
      type: "new_order",
      title: "New order received",
      body: `${orderNumber} — ₹${subtotal}`,
      link: `/admin/orders/${orderId}`,
    });

    // Send templated order confirmation email (best-effort, non-blocking on failure).
    const recipientEmail = userId ? null : guestEmail;
    if (recipientEmail || userId) {
      let toEmail = recipientEmail;
      let toName = userId ? null : guestName;
      if (userId) {
        const [[u]] = await pool.query("SELECT name, email FROM users WHERE id = ?", [userId]);
        toEmail = u?.email;
        toName = u?.name;
      }
      if (toEmail) {
        const template = await getRenderedTemplate("order_confirmation", {
          customer_name: toName || "there",
          order_number: orderNumber,
          total: Number(subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          status: "Placed",
        });
        if (template) {
          await sendNotificationEmail({ to: toEmail, subject: template.subject, html: template.html }).catch(() => {});
        }
      }
    }

    res.status(201).json({ success: true, message: "Order placed.", data: { orderId, orderNumber, total: subtotal } });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Public order tracking — requires order number + the email/phone used at checkout (no auth needed). */
export async function trackOrder(req, res) {
  const { orderNumber, contact } = req.query;
  if (!orderNumber || !contact) {
    return res.status(400).json({ success: false, message: "orderNumber and contact (email or phone) are required." });
  }

  const [rows] = await pool.query(
    `SELECT o.*, u.email as user_email, u.phone as user_phone FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.order_number = ?`,
    [orderNumber]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  // Email comparisons are case/whitespace-insensitive (registration normalizes
  // emails to lowercase, but a person re-typing it on the tracking page may not
  // match that exactly). Phone numbers are compared after stripping spaces/dashes
  // only, since digits themselves should match exactly.
  const norm = (v) => (v || "").trim().toLowerCase();
  const normPhone = (v) => (v || "").replace(/[\s-]/g, "");
  const contactNorm = norm(contact);
  const contactPhoneNorm = normPhone(contact);

  const matches =
    contactNorm === norm(order.guest_email) ||
    contactPhoneNorm === normPhone(order.guest_phone) ||
    contactNorm === norm(order.user_email) ||
    contactPhoneNorm === normPhone(order.user_phone);
  if (!matches) return res.status(403).json({ success: false, message: "Could not verify order ownership." });

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
  const [tracking] = await pool.query("SELECT * FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC", [
    order.id,
  ]);

  res.json({ success: true, data: { order, items, tracking, statusFlow: STATUS_FLOW } });
}

export async function listMyOrders(req, res) {
  const [orders] = await pool.query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [
    req.auth.id,
  ]);
  if (!orders.length) return res.json({ success: true, data: [] });

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id IN (?)", [orders.map((o) => o.id)]);
  const withItems = orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) }));
  res.json({ success: true, data: withItems });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

export async function adminListOrders(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const where = status ? "WHERE status = ?" : "";
  const params = status ? [status] : [];

  const [rows] = await pool.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM orders ${where}`, params);

  res.json({ success: true, data: { orders: rows, total, page: Number(page), limit: Number(limit) } });
}

export async function adminGetOrder(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Order not found." });
  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [id]);
  const [tracking] = await pool.query("SELECT * FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC", [
    id,
  ]);
  res.json({ success: true, data: { order: rows[0], items, tracking } });
}

export async function adminUpdateOrderStatus(req, res) {
  const { id } = req.params;
  const { status, note } = req.body;
  if (!STATUS_FLOW.includes(status) && status !== "cancelled") {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }

  const [rows] = await pool.query(
    `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o
     LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  await pool.query(
    "INSERT INTO order_tracking (order_id, status, note, updated_by_admin_id) VALUES (?, ?, ?, ?)",
    [id, status, note || null, req.auth.id]
  );

  if (order.user_id) {
    await notifyUser(order.user_id, {
      type: "order_status",
      title: `Order ${order.order_number} updated`,
      body: `Status changed to "${status.replace("_", " ")}".`,
      link: `/account/orders`,
    });
  }

  const recipientEmail = order.guest_email || order.user_email || null;
  const recipientName = order.guest_name || order.user_name || "there";
  if (recipientEmail) {
    const template = await getRenderedTemplate("order_status_update", {
      customer_name: recipientName,
      order_number: order.order_number,
      status: status.replace("_", " "),
      note: note || "",
    });
    if (template) {
      await sendNotificationEmail({ to: recipientEmail, subject: template.subject, html: template.html }).catch(() => {});
    } else {
      // Fallback if template missing/disabled — preserves prior behavior.
      await sendNotificationEmail({
        to: recipientEmail,
        subject: `Your Styron TSM order ${order.order_number} is now "${status.replace("_", " ")}"`,
        html: `<p>Hi ${recipientName},</p><p>Your order <b>${order.order_number}</b> status changed to <b>${status.replace("_", " ")}</b>.${note ? ` Note: ${note}` : ""}</p>`,
      }).catch(() => {});
    }
  }

  // Auto-generate + email invoice when an order moves into "processing"
  // (the production-confirmed step in this order's STATUS_FLOW).
  if (status === "processing") {
    await autoGenerateAndEmailInvoice(order);
  }

  res.json({ success: true, message: "Order status updated." });
}

// ---------------------------------------------------------------
// INVOICE PDF
// ---------------------------------------------------------------

/** Customers can download their own order's invoice; admins can download any. */
export async function downloadInvoice(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o
     LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  const isOwner = req.auth?.type === "user" && req.auth.id === order.user_id;
  const isAdmin = req.auth?.type === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: "You don't have access to this invoice." });
  }

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [id]);
  streamInvoicePdf(res, {
    order,
    items,
    customerName: order.user_name || order.guest_name,
    customerEmail: order.user_email || order.guest_email,
  });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
