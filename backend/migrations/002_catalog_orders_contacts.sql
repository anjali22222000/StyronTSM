-- Styron TSM — Phase 2 schema (catalog, orders, contacts, notifications)

-- ---------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)    NOT NULL UNIQUE,
  slug            VARCHAR(140)    NOT NULL UNIQUE,
  description     TEXT            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  category_id     INT             NULL,
  name            VARCHAR(180)    NOT NULL,
  slug            VARCHAR(200)    NOT NULL UNIQUE,
  description     TEXT            NULL,
  price           DECIMAL(12,2)   NOT NULL DEFAULT 0,
  currency        VARCHAR(8)      NOT NULL DEFAULT 'INR',
  stock_quantity  INT             NOT NULL DEFAULT 0,
  sku             VARCHAR(80)     NULL,
  status          ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_products_category (category_id),
  INDEX idx_products_status (status)
) ENGINE=InnoDB;

-- Product images stored on Cloudinary — one product can have many images.
CREATE TABLE IF NOT EXISTS product_images (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  product_id      INT             NOT NULL,
  url             VARCHAR(500)    NOT NULL,
  cloudinary_id   VARCHAR(255)    NOT NULL,
  is_primary      TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order      INT             NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product (product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  order_number      VARCHAR(40)     NOT NULL UNIQUE,
  user_id           INT             NULL,
  guest_name        VARCHAR(120)    NULL,
  guest_email       VARCHAR(190)    NULL,
  guest_phone       VARCHAR(20)     NULL,
  shipping_address  TEXT            NOT NULL,
  subtotal          DECIMAL(12,2)   NOT NULL DEFAULT 0,
  total             DECIMAL(12,2)   NOT NULL DEFAULT 0,
  currency          VARCHAR(8)      NOT NULL DEFAULT 'INR',
  status            ENUM('placed','processing','manufacturing','quality_check','dispatched','delivered','cancelled')
                    NOT NULL DEFAULT 'placed',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_number (order_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT             NOT NULL,
  product_id      INT             NULL,
  product_name    VARCHAR(180)    NOT NULL, -- snapshot, survives product edits/deletes
  unit_price      DECIMAL(12,2)   NOT NULL,
  quantity        INT             NOT NULL DEFAULT 1,
  line_total      DECIMAL(12,2)   NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

-- Status history / timeline for the user-facing tracking page.
CREATE TABLE IF NOT EXISTS order_tracking (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT             NOT NULL,
  status          ENUM('placed','processing','manufacturing','quality_check','dispatched','delivered','cancelled') NOT NULL,
  note            VARCHAR(500)    NULL,
  updated_by_admin_id INT         NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_order_tracking_order (order_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- CONTACTS (inquiries submitted via the contact form)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)    NOT NULL,
  email           VARCHAR(190)    NOT NULL,
  phone           VARCHAR(20)     NULL,
  message         TEXT            NOT NULL,
  status          ENUM('new','replied','closed') NOT NULL DEFAULT 'new',
  admin_reply     TEXT            NULL,
  replied_at      DATETIME        NULL,
  replied_by_admin_id INT         NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (replied_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_contacts_status (status),
  INDEX idx_contacts_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  audience        ENUM('admin','user') NOT NULL,
  -- for audience='user', recipient_id targets one user; NULL means broadcast to all admins (audience='admin')
  recipient_id    INT             NULL,
  type            VARCHAR(60)     NOT NULL, -- e.g. 'new_registration','new_contact','new_order','order_status','chatbot_escalation'
  title           VARCHAR(200)    NOT NULL,
  body            VARCHAR(500)    NULL,
  link            VARCHAR(255)    NULL,     -- frontend route to deep-link to, e.g. /admin/orders/123
  is_read         TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_audience (audience, recipient_id, is_read)
) ENGINE=InnoDB;
