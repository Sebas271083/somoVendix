USE pos_papelera;

-- Track who made each cash movement
ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_name_snapshot VARCHAR(100) DEFAULT NULL;

-- Physically counted cash vs. system expected at close
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS counted_amount DECIMAL(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS register_name VARCHAR(50) DEFAULT NULL;
