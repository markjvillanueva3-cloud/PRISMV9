---
name: reference-h8-coordination-store
description: HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE (H8) — CoordinationStoreEngine replaces WORK_CLAIMS.json with SQLite WAL. 90% latency drop target on multi-chat coord. Migration via scripts/migrate-claims-to-sqlite.mjs.
aliases: reference_h8_coordination_store
type: reference
source: prism-memory
synced: 2026-06-18T04:19:52.906Z
---


**H8 — CoordinationStoreEngine (SQLite WAL)** (shipped 2026-05-13, HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE):

Replaces the single-JSON-file work-claim store (`state/shared/WORK_CLAIMS.json`) with SQLite WAL-mode. The legacy JSON is read+written by `work-claim.mjs` on every Edit/Write PreToolUse hook; with 6 concurrent chats × 10 ops/min ≈ 60 read-modify-writes/min on the same file, that contention is the multi-chat coord bottleneck.

**Files:**
- Engine: `mcp-server/src/engines/CoordinationStoreEngine.ts`
- Tests: `mcp-server/src/__tests__/CoordinationStoreEngine.test.ts` (41 tests, all green)
- Dispatcher: `prism_context:coord_sqlite` (case in `contextDispatcher.ts`, schema in `contextActionSchemas.ts`)
- Migration script: `scripts/migrate-claims-to-sqlite.mjs`
- DB location (live): `state/shared/coordination.db`

**SQLite config:**
- `journal_mode = WAL` — concurrent readers never block writes
- `synchronous = NORMAL` — durable through OS crashes, fast hot path
- `busy_timeout = 5000` ms — concurrent writers wait up to 5 s before `SQLITE_BUSY` (well below 30 s Stop budget)

**Schema (v1):**
```sql
CREATE TABLE claims (
  resource_path TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  pc_name       TEXT NOT NULL DEFAULT '',
  hostname      TEXT NOT NULL DEFAULT '',
  pid           INTEGER NOT NULL DEFAULT 0,
  intent        TEXT NOT NULL DEFAULT '',
  claimed_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);
CREATE INDEX idx_claims_session ON claims(session_id);
CREATE INDEX idx_claims_expires ON claims(expires_at);

CREATE TABLE presence (
  session_id   TEXT PRIMARY KEY,
  pc_name      TEXT NOT NULL DEFAULT '',
  hostname     TEXT NOT NULL DEFAULT '',
  meta_json    TEXT NOT NULL DEFAULT '{}',
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX idx_presence_last_seen ON presence(last_seen_at);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

**Dispatcher (11 modes):**
- `prism_context:coord_sqlite mode=claim resource_path=<p> session_id=<id> ttl_ms=N intent=<text> pid=N hostname=<h> pc_name=<pc>` — returns `{acquired:true,row}` or `{acquired:false,existing,reason}` (same shape as `chatBusEngine.claimFile()`)
- `... mode=release resource_path=<p> session_id=<id>` — returns `{released:bool}`
- `... mode=find resource_path=<p>` — returns `{claim:row|null}`
- `... mode=live` — non-expired claims, oldest first
- `... mode=all` — all claims (admin/debug)
- `... mode=heartbeat session_id=<id> meta={...}` — upsert presence
- `... mode=active_sessions window_ms=N` — recent presence rows, newest first
- `... mode=prune` — janitor (expired claims + stale presence)
- `... mode=counts` — `{claims, presence, schemaVersion}`
- `... mode=health` — `{open, dbPath, journalMode, schemaVersion}`
- `... mode=migrate_from_json source_path=<p>` — one-shot seeder

**To migrate the live fleet:**
```bash
# 1. Dry-run to preview what would be migrated
node H:/prism/scripts/migrate-claims-to-sqlite.mjs --dry-run

# 2. Actual seed (idempotent — re-running is safe)
node H:/prism/scripts/migrate-claims-to-sqlite.mjs

# 3. Verify:
node -e "import('./mcp-server/dist/engines/CoordinationStoreEngine.js').then(m => console.log(m.getCoordinationStoreEngine().counts()))"
```

After migration completes, swap the `work-claim.mjs` hook to call `prism_context:coord_sqlite mode=claim` instead of mutating WORK_CLAIMS.json directly. The legacy JSON file can remain for one fleet cycle as a fallback.

**Backward-compat with legacy schema:**
- `session_id` field falls back to legacy `by` field if missing
- `at` ISO timestamp parsed for `claimed_at`
- `hostname` / `pid` passed through verbatim
- Unknown fields ignored

**Adoption path note**: this unit lands the SQLite backend + dispatcher + migration tool but does NOT modify the legacy `work-claim.mjs` hook. The active fleet keeps writing to WORK_CLAIMS.json. The hook swap is a follow-up (low-risk because the migration is idempotent — re-seed safely before swap).

**Caps** (`COORDINATION_STORE_LIMITS`): SCHEMA_VERSION=1, DEFAULT_CLAIM_TTL_MS=1800000 (30 min — matches work-claim.mjs default), DEFAULT_PRESENCE_TTL_MS=600000 (10 min), MAX_INTENT_BYTES=4096, BUSY_TIMEOUT_MS=5000.

**Related:** [[reference-h7-async-hook-dispatcher]] · [[reference-h6-hook-fast-lane]] · [[reference-h4-hook-envelope]] · [[reference-h2-hook-registry]]
