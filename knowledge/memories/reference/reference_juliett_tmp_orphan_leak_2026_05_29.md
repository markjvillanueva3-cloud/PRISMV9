---
name: reference_juliett_tmp_orphan_leak_2026_05_29
description: 46 orphaned tribal-embed-index.json.<pid>.tmp files (~16 GB) — atomic-write tmp+rename leak class
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.176Z
aliases: reference_juliett_tmp_orphan_leak_2026_05_29
---


**Atomic-write tmp-orphan leak (found 2026-05-29, slot:juliett).**
`state/shared/` held **46 orphaned `tribal-embed-index.json.<pid>.tmp` files, each 369–382 MB (~16 GB total)** — the canonical `atomicWriteJson` tmp+rename failure: the writer creates `<path>.<pid>.tmp`, but if it crashes / is SIGKILLed / overlaps another writer before the rename, the tmp is never consumed and never cleaned.

**Why it matters (juliett domain):** tmp+rename is only atomic-AND-clean if (a) a single writer holds the path and (b) the writer unlinks its tmp in a `finally` on failure. The `tribal-embed-index.json` regen (382 MB target) is large + slow + apparently multi-invoked, so it leaks badly. 16 GB of dead temp on a working drive is real disk pressure.

**RESOLVED 2026-05-29 (highest-ROI database unit):** built `scripts/tmp-orphan-janitor.mjs` (+ 14-test suite) and **reclaimed 19.24 GB (3,628 files, 0 errors)** — dead-PID + age gate, kept 80 alive + 9 young in-flight writes untouched. `atomic-json.mjs` was NOT the leaker (it uses `.tmp-<pid>` + finally-unlink); the leakers are `.skill-auto-trigger-recent.json` (1,382), `.token-budget-*.json`, `ACTIVE_ROADMAP_CLAIMS.json`, `ollama-offload-stats.json`, `tribal-embed-index.json` — each writing `<name>.<pid>.tmp` without cleanup. See [[reference_juliett_tmp_janitor_2026_05_29]].

**Recurrence prevention (follow-ups):**
1. **Schedule the janitor** — golf owns the reaper cadence; recommend wiring `tmp-orphan-janitor.mjs --apply` into the [[reference_fleet_reaper|fleet-reaper]] or a cron (juliett built it writer-agnostic so it needs no per-writer changes).
2. Per-writer `finally`-unlink in the top leakers (skill-auto-trigger, token-budget, claim-registry) — cross-domain follow-ups.
3. Single-canonical-writer for `tribal-embed-index.json` (regen index, not multi-writer).

Recorded in `engines/database-expansion/MEMORY.md` known-failure-modes. Class siblings: [[reference_u_regen_viz_merge_faillod_2026_05_17]] (SIGKILL on merge → silent stale graph).
