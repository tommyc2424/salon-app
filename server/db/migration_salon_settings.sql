-- ============================================================
-- SALON SETTINGS MIGRATION
-- Run in Supabase SQL Editor after migration_multi_tenant.sql
-- ============================================================

ALTER TABLE salons ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
