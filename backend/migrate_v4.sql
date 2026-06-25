USE pos_papelera;

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS credit_note_number INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_note_date DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  quote_number INT NOT NULL,
  customer_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  status ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  valid_until DATE DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes VARCHAR(200) DEFAULT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS installment_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sale_id INT NOT NULL,
  customer_id INT DEFAULT NULL,
  n_installments INT NOT NULL DEFAULT 1,
  amount_per_installment DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_with_interest DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS installments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_date DATETIME DEFAULT NULL,
  paid_by INT DEFAULT NULL,
  notes VARCHAR(200) DEFAULT NULL,
  FOREIGN KEY (plan_id) REFERENCES installment_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS installment_plan_id INT DEFAULT NULL;

SELECT 'Migracion v4 completada' AS resultado;
