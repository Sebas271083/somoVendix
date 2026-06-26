-- V8: Per-tenant feature overrides for super-admin module management
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features_override JSON NULL DEFAULT NULL;

-- Add last_activity tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT NULL DEFAULT NULL;
