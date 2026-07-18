---
name: ollama-stats-tmp-leak-fix-2026-05-31
description: "lib/ollama-stats.mjs atomicWrite leaked 545 orphan .tmp.<pid>.<random> temps (a pattern NO fleet janitor matched). golf fixed: janitor-matched .tmp-<pid> suffix + pre-write reapStaleTmps self-clean."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_stats_tmp_leak_fix_2026_05_31
---


**The leak (found 2026-05-31, slot golf).** `.claude/hooks/lib/ollama-stats.mjs` — the shared offload-telemetry writer (12 hooks bump stats through `recordOffload`/`recordKeep`/`recordSuggest`) — had an `atomicWrite()` whose temp name was `${path}.tmp.${pid}.${rand}` (e.g. `ollama-offload-stats.json.tmp.27168.g0zog5`). Two compounding bugs:
1. **Leaks on kill-mid-write:** the catch-block unlink only runs if `renameSync` THROWS. When the hook's node.exe is **killed** ([[reference_fleet_reaper|fleet-reaper]] / OOM) between `writeFileSync(tmp)` and `renameSync`, no catch runs → the tmp orphans.
2. **Matched NO janitor:** the `.tmp.<pid>.<rand>` pattern is caught by neither `tmp-orphan-janitor.mjs` (`.tmp-<pid>`, `.<pid>.tmp`, `.<pid>.<hex>.tmp`) nor the legacy sweep → orphans accumulated **unswept FOREVER**. Measured: **545 orphan temps** in `mcp-server/data/state/` for this one file.

**The fix (golf):**
- **Janitor-matched suffix:** `${path}.tmp-${process.pid}` (dropped the random — pid is unique per process; Node sync writes are sequential). Now `/\.tmp-\d+$/` → the durable `PRISM Tmp Sweep` task catches any kill-mid-write orphan as a backstop.
- **Pre-write self-clean:** new `reapStaleTmps(path)` runs at the top of every `atomicWrite` — `readdirSync` the dir, unlink `<base>.tmp*` files whose embedded pid is **dead** (`process.kill(pid,0)`) OR mtime **>5min**. The regex `/\.tmp[.-](\d+)/` matches BOTH legacy `.tmp.<pid>` and new `.tmp-<pid>`, so the backlog drains on the next write. Best-effort (never fails a stats write).
- **Validated:** one `recordSuggest` call drained **545 → 0** orphans, wrote the canonical file, created zero new old-pattern temps.

**General lesson (R12 + fleet-wide):** any atomic-writer using a custom `.tmp.*` suffix that doesn't match the janitor's `/\.tmp-\d+$/` / `.<pid>.tmp` patterns will leak unbounded under process-kill. **Standard: write to `${path}.tmp-${process.pid}` and self-clean before write.**

**SYSTEMIC — 20+ sibling writers (grep `\.tmp\.\$\{` over `*.mjs`):** `galaxy-synthesis-refresh`, `brain-refresh`, `galaxy-reflection-synthesis`, `zulu-awareness-run`, `galaxy-meta-synthesis`, `build-memory-index-sidecar`, `build-memory-embeddings-sidecar`, `leverage-ranked-wiring-queue`, `.claude/hooks/tool-watchdog`, `generate-extracted-modules-*`, `build-audit-registry`, `slot-worktree-bootstrap`, `mcp-broadcast-reconnect`, `backfill-*`, `build-graph-index`, … (20+, truncated). Each uses a `.tmp.<pid|timestamp|rand>` suffix the janitor doesn't match → each leaks unswept under kill-mid-write.

**RECOMMENDED GENERIC BACKSTOP — hand to juliett (tmp-orphan-janitor owner, database/persistence galaxy):** extend `scripts/tmp-orphan-janitor.mjs` `pidOf` + `isTmpName` to also match the `.tmp.<pid>[.<rand>]` family (e.g. pidOf `/\.tmp\.(\d+)(?:\.|$)/`, isTmpName `/\.tmp\.[^/\\]+$/`), keeping the existing dead-pid-OR-age + TOCTOU + lock-probe safety. That sweeps ALL 20+ writers' orphans via the durable PRISM Tmp Sweep, no per-writer fix needed. **DONE (golf, 2026-05-31, commit `a66fdb4e32` — `[FLEET-HYGIENE]/U-TMP-JANITOR-DOTFAMILY`):** broadened `pidOf` (`/\.tmp\.(\d+)(?:\.[0-9a-z]+)?$/i`) + `isTmpName` (`/\.tmp\.\d+(\.[0-9a-z]+)?$/i` — the required `\d+` after `.tmp.` excludes real `*.tmp.json`/`*.tmp.backup` files) + the perBase reporting strip; all dead-pid-OR-age + TOCTOU + lock-probe gates untouched. Verified: 21/21 tests (3 new incl the `config.tmp.json` false-positive guard) + real-data dry-run (68 scanned, 3 alive spared, **0 wrong reclaim**). The earlier "owner's call, deferred to juliett" caution was overridden by the operator's standing cleanup mandate + [[feedback_all_slots_free_access]], landed safely because it's dry-runnable with no fleet dependency. Related: [[reference_tmp_orphan_leak_janitor_2026_05_30]] (juliett's janitor + the .tmp-<pid> scan-gate fix), [[reference_prism_task_always_active_hardening_2026_05_31]].
