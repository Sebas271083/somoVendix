-- Variantes de producto
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants TINYINT(1) DEFAULT 0;

CREATE TABLE IF NOT EXISTS product_attributes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  tenant_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  position TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attribute_id INT NOT NULL,
  value VARCHAR(100) NOT NULL,
  position TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  tenant_id INT NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  barcode VARCHAR(100) DEFAULT NULL,
  price DECIMAL(12,2) DEFAULT NULL,
  cost DECIMAL(12,2) DEFAULT NULL,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variant_attribute_values (
  variant_id INT NOT NULL,
  attribute_value_id INT NOT NULL,
  PRIMARY KEY (variant_id, attribute_value_id)
);

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant_id INT DEFAULT NULL;
