-- ====================================================
-- Stock avanzado: Depósitos, Stocktaking, FIFO, Alertas
-- ====================================================

-- 1. Depósitos / ubicaciones
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(200),
  is_default TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NOT NULL DEFAULT 0,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_loc_prod_var (location_id, product_id, variant_id),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 2. Inventario físico (stocktaking)
CREATE TABLE IF NOT EXISTS stocktake_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  location_id INT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  notes TEXT,
  created_by INT NOT NULL,
  closed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stocktake_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL DEFAULT NULL,
  expected_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  counted_qty DECIMAL(10,2) NULL DEFAULT NULL,
  FOREIGN KEY (session_id) REFERENCES stocktake_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 3. Lotes de stock para FIFO / Promedio
CREATE TABLE IF NOT EXISTS stock_lots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL DEFAULT NULL,
  quantity_initial DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity_remaining DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  purchase_order_id INT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. Columnas nuevas
ALTER TABLE sale_items ADD COLUMN unit_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN last_stock_alert TIMESTAMP NULL;

-- 5. Configuración por defecto de método de valoración
INSERT IGNORE INTO settings (tenant_id, `key`, `value`)
SELECT id, 'stock_valuation_method', 'weighted_avg' FROM tenants;

-- 6. Ubicación Principal para tenants existentes
INSERT IGNORE INTO locations (tenant_id, name, is_default)
SELECT id, 'Principal', 1 FROM tenants;

-- 7. Inicializar location_stock desde products.stock (solo productos sin variantes)
INSERT IGNORE INTO location_stock (location_id, product_id, variant_id, quantity)
SELECT l.id, p.id, 0, p.stock
FROM products p
JOIN locations l ON l.tenant_id = p.tenant_id AND l.is_default = 1
WHERE (p.has_variants = 0 OR p.has_variants IS NULL);

-- 8. Lotes iniciales para FIFO (productos sin variantes con stock)
INSERT IGNORE INTO stock_lots (tenant_id, product_id, quantity_initial, quantity_remaining, unit_cost)
SELECT p.tenant_id, p.id, p.stock, p.stock, COALESCE(p.cost, 0)
FROM products p
WHERE p.stock > 0 AND p.active = 1 AND (p.has_variants = 0 OR p.has_variants IS NULL);
