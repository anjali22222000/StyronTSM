-- Styron TSM — Phase 8: extend products with the rich catalog fields the
-- storefront UI was already designed around (grade, size, specs, applications,
-- certifications, related products, ratings, badges).


ALTER TABLE products
  ADD COLUMN grade VARCHAR(60) NULL AFTER name,
  ADD COLUMN size VARCHAR(60) NULL AFTER grade,
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'unit' AFTER currency,
  ADD COLUMN mrp DECIMAL(12,2) NULL AFTER price,
  ADD COLUMN gst_percent DECIMAL(5,2) NOT NULL DEFAULT 18.00 AFTER mrp,
  ADD COLUMN badge VARCHAR(40) NULL,
  ADD COLUMN badge_label VARCHAR(60) NULL,
  ADD COLUMN min_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN min_order INT NOT NULL DEFAULT 1,
  ADD COLUMN weight_per_meter DECIMAL(10,4) NULL,
  ADD COLUMN long_description TEXT NULL,
  ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN review_count INT NOT NULL DEFAULT 0;

-- Structured spec sheet (e.g. "Yield Strength (Min)" -> "500 MPa"), ordered for display.
CREATE TABLE IF NOT EXISTS product_specs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  spec_key    VARCHAR(120) NOT NULL,
  spec_value  VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_specs_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_applications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  application VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_applications_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_certifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  certification VARCHAR(120) NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_certifications_product (product_id)
) ENGINE=InnoDB;

-- Self-referential many-to-many for "Related Products". One row per direction
-- (admin picks related IDs explicitly; not auto-symmetric).
CREATE TABLE IF NOT EXISTS product_related (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  product_id         INT NOT NULL,
  related_product_id INT NOT NULL,
  sort_order         INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_product_related (product_id, related_product_id),
  INDEX idx_product_related_product (product_id)
) ENGINE=InnoDB;
