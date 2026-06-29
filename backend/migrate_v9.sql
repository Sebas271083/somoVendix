-- ============================================================
-- migrate_v9: columnas faltantes en products + tablas purchase_orders
-- ============================================================

-- Columnas que el modelo usa pero nunca se agregaron al schema inicial
ALTER TABLE products ADD COLUMN supplier_id INT DEFAULT NULL;
ALTER TABLE products ADD COLUMN unit VARCHAR(30) DEFAULT 'unidad';

ALTER TABLE products
  ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Órdenes de compra (purchase_orders) — tabla que faltaba en las migraciones anteriores
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT NOT NULL,
  supplier_id   INT DEFAULT NULL,
  user_id       INT NOT NULL,
  subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes         TEXT DEFAULT NULL,
  expected_date DATE DEFAULT NULL,
  status        ENUM('pending','received','cancelled') NOT NULL DEFAULT 'pending',
  received_at   DATETIME DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)  ON DELETE SET NULL,
  FOREIGN KEY (user_id)     REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  product_id        INT NOT NULL,
  quantity          DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit_cost         DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)        REFERENCES products(id)
);
