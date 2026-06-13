-- =============================================
-- MIGRACIÓN: Tablas nuevas del sistema POS
-- Ejecutar sobre la base de datos existente pos_papelera
-- Es seguro ejecutar múltiples veces (IF NOT EXISTS)
-- =============================================

USE pos_papelera;

-- Variaciones de producto (color, talle, modelo)
CREATE TABLE IF NOT EXISTS product_variations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  attribute_name VARCHAR(50) NOT NULL,
  attribute_value VARCHAR(100) NOT NULL,
  extra_price DECIMAL(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Pagos de deuda (cuenta corriente)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  sale_id INT,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('efectivo','debito','credito','transferencia') DEFAULT 'efectivo',
  notes VARCHAR(300),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Movimientos de stock (historial)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('sale','restock','adjustment','cancel') NOT NULL,
  quantity INT NOT NULL,
  before_stock INT NOT NULL,
  after_stock INT NOT NULL,
  reference_id INT,
  notes VARCHAR(200),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Gastos del negocio
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(80) DEFAULT 'General',
  due_date DATE,
  paid_at DATE,
  status ENUM('pending','paid','overdue') DEFAULT 'pending',
  supplier_id INT,
  is_recurring TINYINT(1) DEFAULT 0,
  recurrence_period ENUM('weekly','monthly','yearly') DEFAULT 'monthly',
  payment_method ENUM('efectivo','debito','credito','transferencia') DEFAULT 'efectivo',
  notes TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Flujo de caja (registro general)
CREATE TABLE IF NOT EXISTS cash_flow (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(200) NOT NULL,
  category VARCHAR(80) DEFAULT 'General',
  payment_method ENUM('efectivo','debito','credito','transferencia') DEFAULT 'efectivo',
  reference_type VARCHAR(50),
  reference_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Configuración del negocio
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(80) PRIMARY KEY,
  `value` TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Datos iniciales de configuración
INSERT INTO settings (`key`, `value`) VALUES
  ('business_name', 'Mi Papelería'),
  ('business_address', 'Av. Corrientes 1547'),
  ('business_phone', '011-4444-0000'),
  ('business_email', ''),
  ('currency', 'ARS'),
  ('currency_symbol', '$'),
  ('receipt_footer', '¡Gracias por tu compra!'),
  ('tax_enabled', '0'),
  ('tax_rate', '21'),
  ('logo_url', ''),
  ('thermal_printer_width', '80')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

SELECT 'Migración completada exitosamente' AS resultado;
