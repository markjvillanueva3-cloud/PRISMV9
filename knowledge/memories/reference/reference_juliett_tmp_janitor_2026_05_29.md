---
name: reference_juliett_tmp_janitor_2026_05_29
description: tmp-orphan-janitor — reclaimed 19.24GB of dead atomic-write tmp orphans (highest-ROI database unit, 2026-05-29)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.631Z
aliases: reference_juliett_tmp_janitor_2026_05_29
---


**tmp-orphan-janitor (2026-05-29, slot:juliett — highest-ROI database unit).** Operator asked to assess the highest-ROI database unit; the winner was the atomic-write tmp-orphan cleanup (19 GB live + growing, low cost/risk, unblocked — vs the catalog DB-EXP-MS* units which need external data + multi-session, and the JM-die Qdrant wiring which was blocked by Ollama down).

**Built:** `scripts/build-jm-die-database.mjs`... no — `scripts/tmp-orphan-janitor.mjs` (+ `scripts/tmp-orphan-janitor.test.mjs`, 14 tests PASS). **Reclaimed 19.24 GB (3,628 files, 0 errors)**; kept 80 alive-PID + 9 too-young in-flight writes untouched.

**Design (writer-agnostic safety net):**
- `pidOf(name)` parses 3 PRISM tmp patterns: `.tmp-<pid>` (atomic-json), `.<pid>.<hash>.tmp`, `.<pid>.tmp`.
- Reclaim iff: dead-PID AND age > minAgeMin (default 30) — OR no-pid AND age > nopidAgeHr (default 24). alive-PID NEVER touched (a 382 MB write can be in flight).
- TOCTOU re-check (re-stat + re-verify dead-pid) right before `unlinkSync`. `lstatSync` + `isFile()` so symlinks/dirs are never followed.
- Dry-run DEFAULT; `--apply` to delete. Audit ledger `state/shared/.tmp-janitor-actions.jsonl` (append-only).
- Knobs: `PRISM_TMP_JANITOR_{DISABLE,MIN_AGE_MIN,NOPID_AGE_HR}`; `--dir` (default state/shared + mcp-server/data/state).

**Root cause:** NOT atomic-json.mjs (self-cleans). The leakers each write `<name>.<pid>.tmp` without cleanup: `.skill-auto-trigger-recent.json` (1,382 orphans), `.token-budget-*.json`, `ACTIVE_ROADMAP_CLAIMS.json`, `ollama-offload-stats.json`, `tribal-embed-index.json` (382 MB each).

**Recurrence prevention:** recommend **golf schedule** `tmp-orphan-janitor.mjs --apply` into the [[reference_fleet_reaper|fleet-reaper]] cadence (writer-agnostic → no per-writer changes needed). Per-writer finally-unlink = cross-domain follow-ups. See [[reference_juliett_tmp_orphan_leak_2026_05_29]] + [[feedback_juliett_atomic_write_discipline]].
