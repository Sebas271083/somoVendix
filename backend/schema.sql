-- =============================================
-- POS Papelera - Schema de base de datos MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS pos_papelera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_papelera;

-- Sucursales
CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200),
  phone VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'vendedor') DEFAULT 'vendedor',
  branch_id INT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Categorías de productos
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) UNIQUE NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost DECIMAL(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  category_id INT,
  image_url VARCHAR(300),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Clientes
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  document_type ENUM('DNI','CUIT','CUIL','Pasaporte') DEFAULT 'DNI',
  document_number VARCHAR(20),
  email VARCHAR(150),
  phone VARCHAR(30),
  address VARCHAR(200),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_document_number (document_number)
);

-- Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cajas
CREATE TABLE IF NOT EXISTS cash_registers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  user_id INT,
  opening_amount DECIMAL(12,2) DEFAULT 0,
  closing_amount DECIMAL(12,2),
  status ENUM('open', 'closed') DEFAULT 'open',
  notes TEXT,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Movimientos de caja (ingresos/egresos manuales)
CREATE TABLE IF NOT EXISTS cash_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cash_register_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id)
);

-- Ventas
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number INT NOT NULL,
  customer_id INT,
  user_id INT,
  branch_id INT,
  cash_register_id INT,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_method ENUM('efectivo','debito','credito','transferencia','cuenta_corriente','mixto') DEFAULT 'efectivo',
  payment_details JSON,
  notes TEXT,
  status ENUM('completed','cancelled','pending') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE SET NULL
);

-- Items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

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

-- =============================================
-- Datos iniciales
-- =============================================

INSERT INTO branches (name, address, phone) VALUES
  ('Centro', 'Av. Corrientes 1547', '011-4444-0000');

-- Admin inicial: admin@papelera.com / admin123
INSERT INTO users (name, email, password, role, branch_id) VALUES
  ('Administrador', 'admin@papelera.com',
   '$2a$10$VWu7N84x4agw55jyzUaeI..lr04Y2HCaa1RGWBGZsrZ/sgm8TPTXi',
   'admin', 1),
  ('María Rivas', 'maria@papelera.com',
   '$2a$10$VWu7N84x4agw55jyzUaeI..lr04Y2HCaa1RGWBGZsrZ/sgm8TPTXi',
   'vendedor', 1);

-- Categorías
INSERT INTO categories (name, slug, color) VALUES
  ('Cuadernos', 'cuadernos', '#6366f1'),
  ('Lapiceras', 'lapiceras', '#3b82f6'),
  ('Papel', 'papel', '#10b981'),
  ('Útiles', 'utiles', '#f59e0b'),
  ('Carpetas', 'carpetas', '#f97316'),
  ('Arte', 'arte', '#ec4899'),
  ('Mochilas', 'mochilas', '#8b5cf6'),
  ('Oficina', 'oficina', '#14b8a6'),
  ('Escolar', 'escolar', '#ef4444');

-- Productos de muestra
INSERT INTO products (code, name, price, cost, stock, min_stock, category_id) VALUES
  ('CUA-RIV-84C', 'Cuaderno Rivadavia 84h cuadriculado', 2180, 1200, 42, 10, 1),
  ('BIC-CR-N',    'Bic Cristal negro', 340, 180, 318, 20, 2),
  ('RES-A4-75',   'Resma A4 Ledesma 75g', 6420, 4800, 36, 5, 3),
  ('PEG-VOL-250', 'Pegamento Voligoma 250g', 780, 450, 54, 10, 4),
  ('CAR-N3-OF',   'Carpeta N°3 oficio negra', 1840, 1000, 12, 8, 5),
  ('TEM-ET-12',   'Tempera Eterna x12', 3680, 2100, 24, 5, 6),
  ('MOC-RIV-C',   'Mochila Rivk Comp.', 14200, 9500, 6, 3, 7),
  ('CRA-FIL-24',  'Crayones Filgo x24', 2680, 1500, 88, 15, 4);

-- Cliente consumidor final
INSERT IGNORE INTO customers (name, document_type, document_number) VALUES
  ('Consumidor Final', 'DNI', '00000000');

-- Configuración inicial del negocio
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
