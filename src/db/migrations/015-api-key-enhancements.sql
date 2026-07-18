-- ============================================================================
-- Migration 015: API Key + User Plan Enhancements — INFRA-3-3 U-AUTH3
-- ============================================================================
-- Adds plan column to users table for tier gate enforcement.
-- Adds hash index on api_keys.key_hash for O(1) lookup.
-- Adds plan column to api_keys for per-key plan override.
-- ============================================================================

-- Add plan column to users (defaults to 'free')
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'starter', 'pro', 'shop', 'enterprise'));

-- Add plan override to api_keys (NULL = inherit from user)
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS plan_override VARCHAR(20) DEFAULT NULL
  CHECK (plan_override IS NULL OR plan_override IN ('free', 'starter', 'pro', 'shop', 'enterprise'));

-- Add scope column to api_keys for granular feature access
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'read';

-- Hash index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys USING hash (key_hash);

-- Partial index: only active (non-revoked) keys
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys (key_hash)
  WHERE revoked = false;

-- Index for user lookup (get all keys for a user)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON api_keys (user_id)
  WHERE revoked = false;

-- View: active API keys with user info (for admin dashboard)
CREATE OR REPLACE VIEW api_keys_active AS
  SELECT
    ak.id,
    ak.name,
    ak.user_id,
    u.username,
    u.email,
    u.role,
    COALESCE(ak.plan_override, u.plan) as effective_plan,
    ak.permissions,
    ak.scope,
    ak.last_used_at,
    ak.created_at,
    ak.expires_at
  FROM api_keys ak
  JOIN users u ON u.id = ak.user_id
  WHERE ak.revoked = false
    AND u.active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
