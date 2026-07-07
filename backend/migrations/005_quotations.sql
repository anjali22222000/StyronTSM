-- Styron TSM — Phase: Quotation module

CREATE TABLE IF NOT EXISTS quotations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  quotation_number VARCHAR(40)    NOT NULL UNIQUE,
  user_id         INT             NULL,
  -- Customer details (snapshot at time of request)
  customer_name   VARCHAR(120)    NOT NULL,
  customer_email  VARCHAR(190)    NOT NULL,
  customer_phone  VARCHAR(20)     NULL,
  customer_company VARCHAR(160)   NULL,
  customer_address TEXT           NULL,
  customer_gstin  VARCHAR(20)     NULL,
  -- Financials
  subtotal        DECIMAL(14,2)   NOT NULL DEFAULT 0,
  cgst            DECIMAL(14,2)   NOT NULL DEFAULT 0,
  sgst            DECIMAL(14,2)   NOT NULL DEFAULT 0,
  total           DECIMAL(14,2)   NOT NULL DEFAULT 0,
  -- Status
  status          ENUM('draft','sent','viewed','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  valid_until     DATE            NULL,
  notes           TEXT            NULL,
  -- Audit
  email_sent_at   DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_quotations_email (customer_email),
  INDEX idx_quotations_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id    INT             NOT NULL,
  product_name    VARCHAR(180)    NOT NULL,
  grade           VARCHAR(60)     NULL,
  quantity        DECIMAL(12,3)   NOT NULL,
  unit            VARCHAR(20)     NOT NULL DEFAULT 'MT',
  unit_price      DECIMAL(12,2)   NOT NULL,
  line_total      DECIMAL(14,2)   NOT NULL,
  sort_order      INT             NOT NULL DEFAULT 0,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  INDEX idx_quotation_items_quot (quotation_id)
) ENGINE=InnoDB;
