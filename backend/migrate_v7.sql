-- migrate_v7.sql: Gastos mejorados (comprobante, recurrencia automática, aprobación)

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_path VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approval_status ENUM('awaiting_approval','approved','rejected') DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejection_notes VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_due_date DATE DEFAULT NULL;
