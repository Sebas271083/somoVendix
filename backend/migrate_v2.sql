-- =============================================
-- Gestix v2 — Mejoras POS
-- Ejecutar sobre pos_papelera existente
-- Seguro de correr múltiples veces
-- =============================================

USE pos_papelera;

-- Notas por ítem de venta
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS notes VARCHAR(200) DEFAULT NULL;

SELECT 'Migración v2 completada' AS resultado;
