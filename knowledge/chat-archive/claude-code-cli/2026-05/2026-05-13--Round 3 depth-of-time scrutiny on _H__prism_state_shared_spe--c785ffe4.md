---
type: "chat-session"
source: "claude-code-cli"
session_id: "c785ffe4-cff7-477e-b466-ab1899a5842e"
title: "Round 3 depth-of-time scrutiny on `H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0"
date: "2026-05-13"
first_ts: "2026-05-13T13:14:43.475Z"
last_ts: "2026-05-13T13:15:46.598Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a04e68399b4ec7642.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Round 3 depth-of-time scrutiny on `H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a04e68399b4ec7642.jsonl`

## Transcript

### User | 2026-05-13T13:14:43.475Z

Round 3 depth-of-time scrutiny on `H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md`. Read both ITERATION 2 and ITERATION 3 sections.

YOUR LENS: **What bites us 3 months into operation that doesn't bite in week 1?** Long-tail failure modes that surface ONLY after sustained operation:

1. **Ledger growth long-tail** — `bug_attribution` table at 5 commits/hour × 24 × 90 days = 10,800 rows. Bounded but trivial. BUT `peer_audit_ticks` at 200 ticks/day × 90 days = 18,000 rows. AGENT_CHAT signals at 24/day × 90 days = 2,160. F-series dashboards regenerate daily → 90 × 8 dashboards = 720 dashboard rotations under R1-B13 200KB cap × 8 dashboards × 365 days = ~580 MB dashboard archive. Bigger than expected. Spec has no archive-archive (annual rotation).

2. **Model drift accumulator** — B9 weekly model-drift eval. After 12 weeks, ledger has 12 datapoints. After 52 weeks, 52. The "agreement <80% with prior week" comparison is between week N and N-1, but drift can be gradual — 99% week-over-week, 50% over 12 weeks. Spec needs a "drift slope" check, not just point-to-point.

3. **CronList survives but jobIds rotate** — every Claude session restart issues new jobIds. E2 + G8 reconcile on every session start. After 30 daily restarts = 30 batches of stale jobIds in `golf-cron-registry.json` if reconciliation race-conditions. Cleanup criterion?

4. **Schema versioning compounding** — by month 3 we may be on v2 or v3 of multiple ledger schemas. JSONLSchemaReaderHelper handles forward-compat but the REVERSE migration (read v3 written-by-future-build with v2 reader still in production) is undefined. What's the version-skew policy across the 6+ chats?

5. **Disaster-recovery practice** — G12 snapshots daily. Has anyone actually RESTORED from snapshot? In 3 months, a disaster will happen. Without a practiced restore procedure documented + tested in CI, the snapshots are theater. Spec needs: monthly "DR fire drill" test that restores from snapshot and validates.

6. **PR / re
... [+2869 chars truncated]

### Assistant | 2026-05-13T13:14:49.500Z

I'll perform the depth-of-time scrutiny review of the spec, focusing on long-tail failure modes that surface only after sustained operation.

### Assistant | 2026-05-13T13:14:49.877Z

[tool_use: Read]

### User | 2026-05-13T13:14:54.089Z

[tool_result] 1	# GOLF-WATCHDOG-MS0 — 7th Slot Cleanup + Bug-Watcher + CLAUDE.md Slim + Wiring-Potential
2	
3	**Author:** chat alpha (claude-7f79dd78), 2026-05-13
4	**Trigger:** `/forge6` brainstorm + plan
5	**Scope:** Add a dedicated 7th "golf" chat slot to the 6-slot fleet whose sole role is system hygiene — process reaping, bug-watching, graph-grooming, wiring-potential surfacing — and slim CLAUDE.md via Obs
... [+50301 chars truncated]

### Assistant | 2026-05-13T13:15:46.598Z

# ROUND 3 DEPTH-OF-TIME SCRUTINY — GOLF-WATCHDOG-MS0

**Lens:** Long-tail failure modes (month 3+, not week 1).

---

## P0 — Will Hurt by Month 3

**1. [P0] Dashboard archive growth unbounded (R1-B13 gap).** R1-B13 caps live dashboards at 200KB with rotation, but archive directories themselves grow unbounded. 8 dashboards × 365 daily rotations × 200KB ≈ 580MB/year — bigger than the spec assumes. **Fix:** add **G13 archive-archive cron** — annual gzip-bundle of `state/shared/dashboards/.archive/<YYYY>/` to `H:/prism-backups/dashboard-archives/`, retain 2 years, delete older.

**2. [P0] Model drift slope check missing (R2-UU9 incomplete).** B9 compares week-N vs week-N-1 only. Drift can be 99% week-over-week and 50% over 12 weeks. **Fix:** B9 stores 12-week rolling window; alerts on **slope** (`agreement_t - agreement_{t-12} < -0.20`) in addition to point-to-point. Also alert on absolute floor (`< 0.70` at any point).

**3. [P0] DR snapshot never restored = theater (G12 incomplete).** G12 takes daily snapshots; no proof restore works. Schrödinger's backup. **Fix:** **G14 monthly DR fire drill** — restore latest snapshot to `H:/prism-dr-test/`, run `coord_sqlite health` + `bug_attribution` row-count parity check, write pass/fail to `state/shared/DR_DRILL_LEDGER.jsonl`. Fail-loud per R12.

**4. [P0] JSONL→SQLite version-skew across 6+ chats undefined (R2-UU6 partial).** Reader helper handles forward-compat (old reader reads new file) by tolerating unknown fields. REVERSE case undefined: golf chat upgrades schema v1→v2; 5 peer chats still run v1 reader; new rows have v2 required fields v1 reader chokes on. **Fix:** declare in CLAUDE.md and `helpers/jsonl-schema-reader.mjs`: **schema bumps are additive-only for 1 release cycle**; required-field-additions deferred to N+1 cycle after all chats restarted. Track active reader versions in `state/shared/.schema-active-versions.json` (heartbeat-updated per chat).

**5. [P0] Compaction-induced double-fire on cron dispatch (#15).
... [+6515 chars truncated]
