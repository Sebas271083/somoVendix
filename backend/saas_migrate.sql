-- =============================================
-- GESTIX — Migración SaaS
-- Ejecutar sobre pos_papelera existente
-- =============================================

USE pos_papelera;

-- =============================================
-- 1. NUEVAS TABLAS SAAS
-- =============================================

CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  max_products INT DEFAULT 50,          -- NULL = ilimitado
  max_users INT DEFAULT 1,
  max_sales_per_month INT DEFAULT 200,  -- NULL = ilimitado
  features JSON,                        -- módulos habilitados
  price DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(150) NOT NULL,
  plan_id INT NOT NULL DEFAULT 1,
  status ENUM('trial','active','suspended','cancelled') DEFAULT 'trial',
  trial_ends_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('trialing','active','past_due','cancelled') DEFAULT 'trialing',
  trial_ends_at TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  external_id VARCHAR(100),             -- ID de Stripe/MP para después
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Usuarios del super-admin (separados de los tenants)
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. DATOS INICIALES DE PLANES
-- =============================================

INSERT INTO plans (id, name, slug, max_products, max_users, max_sales_per_month, features, price) VALUES
(1, 'Gratis', 'free',
  50, 1, 200,
  '{"reports":false,"receivables":false,"cashflow":false,"expenses":false,"suppliers":false}',
  0),
(2, 'Pro', 'pro',
  NULL, 3, NULL,
  '{"reports":true,"receivables":true,"cashflow":true,"expenses":true,"suppliers":true}',
  0),
(3, 'Business', 'business',
  NULL, NULL, NULL,
  '{"reports":true,"receivables":true,"cashflow":true,"expenses":true,"suppliers":true}',
  0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================
-- 3. TENANT INICIAL (datos existentes)
-- =============================================

INSERT INTO tenants (id, name, subdomain, email, plan_id, status, trial_ends_at)
SELECT 1, b.name, 'demo', 'admin@gestix.app', 2, 'active', NULL
FROM branches b WHERE b.id = 1
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO subscriptions (tenant_id, plan_id, status)
VALUES (1, 2, 'active')
ON DUPLICATE KEY UPDATE status = 'active';

-- Super-admin inicial: superadmin@gestix.app / gestix2024
INSERT INTO admins (name, email, password)
VALUES ('Super Admin', 'superadmin@gestix.app',
  '$2a$10$VWu7N84x4agw55jyzUaeI..lr04Y2HCaa1RGWBGZsrZ/sgm8TPTXi')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================
-- 4. AGREGAR tenant_id A TODAS LAS TABLAS
-- =============================================

-- users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_users_tenant (tenant_id);

-- categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_categories_tenant (tenant_id);

-- products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_products_tenant (tenant_id);

-- customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_customers_tenant (tenant_id);

-- suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_suppliers_tenant (tenant_id);

-- sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_sales_tenant (tenant_id);

-- cash_registers
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_cash_registers_tenant (tenant_id);

-- cash_movements
ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_cash_movements_tenant (tenant_id);

-- expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_expenses_tenant (tenant_id);

-- cash_flow
ALTER TABLE cash_flow
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_cash_flow_tenant (tenant_id);

-- payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 AFTER id,
  ADD INDEX IF NOT EXISTS idx_payments_tenant (tenant_id);

-- =============================================
-- 5. SETTINGS: cambiar PK a (tenant_id, key)
-- =============================================

-- Agregar tenant_id si no existe
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS tenant_id INT NOT NULL DEFAULT 1 FIRST;

-- Reconstruir PK compuesta
ALTER TABLE settings DROP PRIMARY KEY;
ALTER TABLE settings ADD PRIMARY KEY (tenant_id, `key`);

-- =============================================
-- 6. TODOS LOS DATOS EXISTENTES → tenant 1
-- =============================================

UPDATE users         SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE categories    SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE products      SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE customers     SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE suppliers     SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE sales         SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE cash_registers SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE cash_movements SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE expenses      SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE cash_flow     SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE payments      SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;
UPDATE settings      SET tenant_id = 1 WHERE tenant_id = 0 OR tenant_id IS NULL;

SELECT 'Migración SaaS completada' AS resultado;
