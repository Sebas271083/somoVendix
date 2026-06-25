-- =============================================
-- Gestix v3 — Devoluciones
-- Seguro de correr múltiples veces
-- =============================================

USE pos_papelera;

CREATE TABLE IF NOT EXISTS returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sale_id INT NOT NULL,
  user_id INT,
  reason VARCHAR(200),
  refund_method ENUM('efectivo','debito','credito','transferencia','cuenta_corriente') DEFAULT 'efectivo',
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  sale_item_id INT,
  product_id INT,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

SELECT 'Migración v3 completada' AS resultado;
