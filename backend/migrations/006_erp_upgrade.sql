-- Styron TSM — ERP Upgrade: steel prices, featured products, payments, email templates

-- ── USER PROFILE FIELDS (for Excel export: company, GST, address) ────────────
ALTER TABLE users
  ADD COLUMN company VARCHAR(160) NULL AFTER phone,
  ADD COLUMN gstin VARCHAR(20) NULL AFTER company,
  ADD COLUMN address TEXT NULL AFTER gstin;
-- ── INVOICES (auto-generated, stored as metadata; PDF built on demand from order data) ─
CREATE TABLE IF NOT EXISTS invoices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(60)    NOT NULL UNIQUE,
  order_id        INT            NOT NULL,
  emailed_at      DATETIME       NULL,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_invoices_order (order_id)
) ENGINE=InnoDB;

-- ── STEEL PRICE TICKER ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS steel_prices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  label       VARCHAR(160)   NOT NULL,
  price       DECIMAL(12,2)  NOT NULL,
  unit        VARCHAR(30)    NOT NULL DEFAULT 'Ton',
  sort_order  INT            NOT NULL DEFAULT 0,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO steel_prices (label, price, unit, sort_order) VALUES
  ('TMT FE500 12mm', 58500, 'Ton', 1),
  ('TMT FE500 16mm', 59000, 'Ton', 2),
  ('TMT FE550 20mm', 60000, 'Ton', 3),
  ('Binding Wire',   67,    'kg',  4),
  ('ISMC 100',       72,    'kg',  5),
  ('MS Angle 50x50', 68,   'kg',  6);

-- ── FEATURED PRODUCTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS featured_products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT            NOT NULL UNIQUE,
  sort_order  INT            NOT NULL DEFAULT 0,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── PAYMENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  payment_id       VARCHAR(60)    NOT NULL UNIQUE,
  order_id         INT            NULL,
  customer_name    VARCHAR(120)   NULL,
  customer_email   VARCHAR(190)   NULL,
  amount           DECIMAL(14,2)  NOT NULL DEFAULT 0,
  currency         VARCHAR(8)     NOT NULL DEFAULT 'INR',
  payment_method   VARCHAR(60)    NULL,
  gateway          VARCHAR(60)    NULL DEFAULT 'Manual',
  transaction_id   VARCHAR(120)   NULL,
  status           ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  notes            TEXT           NULL,
  paid_at          DATETIME       NULL,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB;

-- ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(80)    NOT NULL UNIQUE,
  name        VARCHAR(120)   NOT NULL,
  subject     VARCHAR(255)   NOT NULL,
  html_body   LONGTEXT       NOT NULL,
  variables   TEXT           NULL COMMENT 'JSON array of available template variables',
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO email_templates (`key`, name, subject, html_body, variables) VALUES
('order_confirmation', 'Order Confirmation', 'Your order {{order_number}} is confirmed — Styron TSM',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:#0b1628;padding:24px 32px;display:flex;align-items:center;gap:12px">
    <div style="background:#f97316;border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:20px">S</div>
    <div style="color:#fff;font-size:20px;font-weight:bold">Styron TSM</div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0b1628;margin:0 0 8px">Order Confirmed! 🎉</h2>
    <p style="color:#64748b">Hi {{customer_name}},</p>
    <p style="color:#64748b">Your order <strong style="color:#0b1628">{{order_number}}</strong> has been placed successfully.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px;color:#0b1628;font-weight:bold">Order Summary</p>
      <p style="margin:0;color:#64748b">Total: <strong style="color:#f97316">₹{{total}}</strong></p>
      <p style="margin:4px 0 0;color:#64748b">Status: <strong>{{status}}</strong></p>
    </div>
    <p style="color:#64748b">We will notify you at every step. Thank you for choosing Styron TSM!</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px">
    Styron TSM · Steel Reinforcement Manufacturing · sales@styrontsm.com
  </div>
</div>',
'["customer_name","order_number","total","status"]'),

('order_status_update', 'Order Status Update', 'Your Styron TSM order {{order_number}} is now "{{status}}"',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:#0b1628;padding:24px 32px">
    <div style="color:#fff;font-size:20px;font-weight:bold">Styron TSM</div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0b1628;margin:0 0 8px">Order Update</h2>
    <p style="color:#64748b">Hi {{customer_name}},</p>
    <p style="color:#64748b">Your order <strong style="color:#0b1628">{{order_number}}</strong> status has been updated to <strong style="color:#f97316">{{status}}</strong>.</p>
    <p style="color:#64748b">{{note}}</p>
    <p style="color:#64748b">You can track your order at any time on our website.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px">
    Styron TSM · sales@styrontsm.com
  </div>
</div>',
'["customer_name","order_number","status","note"]'),

('invoice_email', 'Invoice Email', 'Invoice for your Styron TSM order {{order_number}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:#0b1628;padding:24px 32px">
    <div style="color:#fff;font-size:20px;font-weight:bold">Styron TSM</div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0b1628;margin:0 0 8px">Invoice Attached</h2>
    <p style="color:#64748b">Hi {{customer_name}},</p>
    <p style="color:#64748b">Please find your invoice for order <strong style="color:#0b1628">{{order_number}}</strong> attached to this email.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:0;color:#64748b">Invoice No: <strong>{{invoice_number}}</strong></p>
      <p style="margin:4px 0 0;color:#64748b">Amount: <strong style="color:#f97316">₹{{total}}</strong></p>
    </div>
    <p style="color:#64748b">Keep this for your records. For any queries, contact sales@styrontsm.com.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px">
    Styron TSM · Steel Reinforcement Manufacturing
  </div>
</div>',
'["customer_name","order_number","invoice_number","total"]'),

('quotation_email', 'Quotation Email', 'Your Styron TSM Quotation {{quotation_number}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:#0b1628;padding:24px 32px">
    <div style="color:#fff;font-size:20px;font-weight:bold">Styron TSM</div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0b1628;margin:0 0 8px">Your Quotation is Ready</h2>
    <p style="color:#64748b">Hi {{customer_name}},</p>
    <p style="color:#64748b">Thank you for your inquiry. Please find your quotation <strong style="color:#0b1628">{{quotation_number}}</strong> attached.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:0;color:#64748b">Total Amount: <strong style="color:#f97316">₹{{total}}</strong></p>
      <p style="margin:4px 0 0;color:#64748b">Valid Until: <strong>{{valid_until}}</strong></p>
    </div>
    <p style="color:#64748b">To place an order based on this quotation, reply to this email or call us.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px">
    Styron TSM · +91 12345 67890 · sales@styrontsm.com
  </div>
</div>',
'["customer_name","quotation_number","total","valid_until"]');
