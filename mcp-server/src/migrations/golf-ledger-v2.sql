-- golf-ledger-v2.sql — schema bump for U-CLEANUP-B5
--
-- ATOMIC-COMMIT REQUIREMENT
-- ─────────────────────────
-- This file MUST land in the SAME commit as the matching LedgerStoreEngine.ts
-- changes (LEDGER_SCHEMA_VERSION → 2, versioned migration-path resolution,
-- pragma table_info() column-existence guard inside `migrate(2)`). Before those
-- engine changes land, this file is *unreachable* through the engine's public
-- API: `applyMigrationSql()` hard-codes `DEFAULT_MIGRATION_SQL_PATH` to v1.sql
-- and `migrate()` throws for any `version !== 1`. A reviewer flagged this as P0
-- 2026-05-13 — the fix is the engine update, not weakening this file.
--
-- B5 adds 6 columns to bug_attribution + 2 indexes to support:
--   (a) per-slot rolling 24h scoring with cost-attribution (tokens_spent,
--       cost_usd_micros)
--   (b) pre-dispatch row write for compaction-survival (agent_type,
--       dispatch_prompt, expected_files_json, originating_tick_id) — the
--       context the result handler reconstructs from disk if the originating
--       chat compacts before the reviewer reply lands.
--
-- IDEMPOTENCY: sqlite has no `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
-- Idempotency is enforced at the engine level: `LedgerStoreEngine.migrate(2)`
-- checks `pragma table_info(bug_attribution)` against the required column set
-- BEFORE running this file, and skips the ALTERs (re-runs only the CREATE
-- INDEX, which IS guarded by IF NOT EXISTS). Re-running v2.sql directly on a
-- v2 DB raises "duplicate column name" — by design — to fail loud per R12
-- rather than mask a stale-migration bug.
--
-- DO NOT INVOKE DIRECTLY (e.g. `sqlite3 coordination.db < golf-ledger-v2.sql`)
-- — that bypasses the column-existence guard and risks the duplicate-column
-- failure on any DB already at v2. The only supported entry point is
-- `LedgerStoreEngine.migrate(2)`, which consults `ledger_meta.ledger_schema_version`
-- and `pragma table_info()` before applying ALTERs.
--
-- COST PRECISION CHOICE — INTEGER micro-USD, not REAL USD
-- ───────────────────────────────────────────────────────
-- `cost_usd_micros` stores cost in 10⁻⁶ USD (1 USD = 1,000,000 micros). REAL
-- columns were considered and rejected: SUM(cost) aggregates over thousands of
-- rows accumulate float-drift error that corrupts billing roll-ups (B12 LoRA
-- export GROUP BYs in particular). INTEGER micro-USD gives:
--   • Exact arithmetic under SUM / AVG / per-agent aggregates.
--   • Range 64-bit signed → 9.2 × 10¹² USD ceiling — never exhausted.
--   • Sub-cent precision (0.000001 USD = $0.000001) — fine for per-token cost
--     attribution (Claude Opus at $0.075/1K tokens = 75 micros/token).
-- Engine API layer accepts USD-decimal in / returns USD-decimal out via
-- `microsToUsd()` / `usdToMicros()` helpers — callers never deal with the unit.
--
-- WHY 4 NULLABLE COLUMNS + 2 DEFAULT-0 COLUMNS (not 6 NOT NULL): pre-existing
-- v1 rows pre-date the B5 contract and don't have agent_type, dispatch_prompt,
-- expected_files_json, or originating_tick_id captured. Forcing NOT NULL would
-- require a back-fill migration we can't honestly populate. tokens_spent +
-- cost_usd_micros default to 0 because "no cost recorded" is the truthful
-- back-fill value — distinguishes a v1-era bug (cost=0, unknown) from a v2
-- pre-dispatch bug (cost=0, observed, no work yet, agent_type IS NOT NULL).
--
-- COLUMN NAMING: snake_case to match v1 conventions. TS interfaces in
-- LedgerStoreEngine carry the same names verbatim — no mapping layer.

-- Cost attribution (always populated post-B5; legacy rows default to 0).
-- See header for the INTEGER micro-USD rationale.
ALTER TABLE bug_attribution ADD COLUMN tokens_spent     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bug_attribution ADD COLUMN cost_usd_micros  INTEGER NOT NULL DEFAULT 0;

-- Pre-dispatch / compaction-survival context. Nullable: only populated for
-- rows written via insertPreDispatchRow() — legacy / detector-style
-- insertions still work without it.
--
-- LOGICAL FK (no SQLite FK constraint, intentional — v1.sql line 12-13 sets
-- the "no cross-table FKs" doctrine for this DB to keep coordination.db
-- droppable independently of golf-ledger schema):
--   bug_attribution.originating_tick_id → peer_audit_ticks.tick_id
--     • peer_audit_ticks.tick_id is UNIQUE (see v1.sql line 40).
--     • Result-handler joins use idx_bug_attribution_tick on this side and
--       the implicit UNIQUE index on peer_audit_ticks side → both O(log n).
--     • Enforcement happens at the engine boundary in insertPreDispatchRow,
--       which optionally validates the referenced tick_id exists before
--       INSERTing the bug row.
ALTER TABLE bug_attribution ADD COLUMN agent_type          TEXT;
ALTER TABLE bug_attribution ADD COLUMN dispatch_prompt     TEXT;
ALTER TABLE bug_attribution ADD COLUMN expected_files_json TEXT;
ALTER TABLE bug_attribution ADD COLUMN originating_tick_id TEXT;

-- Indexes for B5 scoring + B4-result-handler joins.
--   idx_bug_attribution_tick    — lets the result handler look up the
--                                 pre-dispatch row by tick_id in O(log n).
--   idx_bug_attribution_agent   — supports per-agent leaderboards (LoRA
--                                 training export per B12 will GROUP BY
--                                 agent_type).
CREATE INDEX IF NOT EXISTS idx_bug_attribution_tick   ON bug_attribution(originating_tick_id);
CREATE INDEX IF NOT EXISTS idx_bug_attribution_agent  ON bug_attribution(agent_type);
