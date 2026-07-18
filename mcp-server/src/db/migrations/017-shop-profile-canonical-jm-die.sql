-- Migration 017: Canonical JM Die shop profile extensions for APPW
-- Adds durable metadata so the PRISM app and MCP server can treat JM Die
-- as the shared development/test shop throughout rollout.

ALTER TABLE shop_profiles
  ALTER COLUMN id SET DEFAULT 'jm-die';

ALTER TABLE shop_profiles
  ALTER COLUMN name SET DEFAULT 'JM Die Company';

ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS admin_burden_pct NUMERIC(5,2) NOT NULL DEFAULT 12.00
    CHECK (admin_burden_pct >= 0 AND admin_burden_pct <= 200);

ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS company_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS source_roots JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS seed_domains JSONB NOT NULL DEFAULT '[]'::jsonb;
