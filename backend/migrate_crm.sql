-- ============================================================
-- CRM / Clientes avanzado: segmentos, fidelización, campañas
-- ============================================================

-- 1. Nuevas columnas en customers
ALTER TABLE customers ADD COLUMN segment ENUM('general','mayorista','minorista','vip') DEFAULT 'general';
ALTER TABLE customers ADD COLUMN birthday DATE NULL;
ALTER TABLE customers ADD COLUMN tags TEXT NULL;
ALTER TABLE customers ADD COLUMN preferences TEXT NULL;
ALTER TABLE customers ADD COLUMN points_balance INT DEFAULT 0;

-- 2. Historial de interacciones CRM
CREATE TABLE IF NOT EXISTS customer_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  type ENUM('note','call','email','whatsapp','visit','other') DEFAULT 'note',
  subject VARCHAR(200) NULL,
  body TEXT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Log de puntos de fidelización
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  type ENUM('earn','redeem','adjust') DEFAULT 'earn',
  points INT NOT NULL,
  balance_after INT NOT NULL DEFAULT 0,
  reference_type ENUM('sale','manual','redemption') DEFAULT 'sale',
  reference_id INT NULL,
  notes VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 4. Listas de precios por segmento
CREATE TABLE IF NOT EXISTS price_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  segment ENUM('general','mayorista','minorista','vip') NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  UNIQUE KEY uq_tenant_segment (tenant_id, segment),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 5. Campañas de email/WhatsApp
CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  channel ENUM('email','whatsapp') DEFAULT 'email',
  subject VARCHAR(300) NULL,
  body TEXT NOT NULL,
  segment ENUM('all','general','mayorista','minorista','vip') DEFAULT 'all',
  status ENUM('draft','sent') DEFAULT 'draft',
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  sent_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 6. Settings de fidelización para tenants existentes
INSERT IGNORE INTO settings (tenant_id, `key`, `value`) SELECT id, 'loyalty_enabled', '0' FROM tenants;
INSERT IGNORE INTO settings (tenant_id, `key`, `value`) SELECT id, 'loyalty_points_per_peso', '0.01' FROM tenants;
INSERT IGNORE INTO settings (tenant_id, `key`, `value`) SELECT id, 'loyalty_peso_per_point', '1' FROM tenants;

-- 7. Listas de precios iniciales para tenants existentes
INSERT IGNORE INTO price_lists (tenant_id, name, segment, discount_pct)
SELECT id, 'General', 'general', 0 FROM tenants;
INSERT IGNORE INTO price_lists (tenant_id, name, segment, discount_pct)
SELECT id, 'Minorista', 'minorista', 0 FROM tenants;
INSERT IGNORE INTO price_lists (tenant_id, name, segment, discount_pct)
SELECT id, 'Mayorista', 'mayorista', 10 FROM tenants;
INSERT IGNORE INTO price_lists (tenant_id, name, segment, discount_pct)
SELECT id, 'VIP', 'vip', 15 FROM tenants;
