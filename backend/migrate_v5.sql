USE pos_papelera;

CREATE TABLE IF NOT EXISTS afip_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL UNIQUE,
  cuit VARCHAR(20) NOT NULL DEFAULT '',
  punto_venta INT NOT NULL DEFAULT 1,
  iva_condition ENUM('responsable_inscripto','monotributista','exento') NOT NULL DEFAULT 'responsable_inscripto',
  cert_pem MEDIUMTEXT DEFAULT NULL,
  key_pem MEDIUMTEXT DEFAULT NULL,
  environment ENUM('homologacion','produccion') NOT NULL DEFAULT 'homologacion',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_type TINYINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_number INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cae VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cae_vto DATE DEFAULT NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS iva_condition ENUM('consumidor_final','responsable_inscripto','monotributista','exento') DEFAULT 'consumidor_final';
