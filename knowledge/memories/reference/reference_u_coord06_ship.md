---
name: reference_u_coord06_ship
description: "COORD-MS0/U-COORD06 (Startup Banner — Session Count Display) shipped 2026-05-14 — banner extension + 48-test suite, collision into peer commit f650a8ebd"
aliases: reference_u_coord06_ship
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.994Z
---


U-COORD06 "Startup Banner — Session Count Display" shipped 2026-05-14 by claude-1642fd87 (slot alpha, /loop dynamic mode).

**What shipped:** Extended `.claude/hooks/coordination-startup-banner.mjs` (U-COORD01-era 53-line stub) to the full deliverable — offline detection (missing/corrupt/null/non-object summary, daemon_active=false, stale-snapshot age via `PRISM_COORD_BANNER_STALE_MS` default 10min), TTL-gated /who hint (`PRISM_COORD_BANNER_HINT_TTL_MS` default 7d — re-fires periodically; the original exists-check was dead-on-arrival because the marker file already existed shared-H:/-drive-wide), defensive `Number()/isFinite/floor` session-count phrasing. Tier corrected **T4→T2** (SessionStart is synchronous; T4 is the AsyncHookDispatcher Stop-hook queue). 48-case test suite `mcp-server/src/__tests__/coordinationStartupBanner.test.ts` — real `spawnSync` subprocess, no mocks, exact-string + regex asserts only, strips inherited `PRISM_COORD_BANNER_*` env so a leaked parent knob cannot corrupt a test.

**Collision (do NOT re-ship):** Built in worktree `H:/prism-coord-ms0` (commit `0ce19b07c` on `work/coord-ms0`). Content reached `cad-fusion-live-ms0` **byte-identical** (blobs `0b8ce55e4` hook + `b5dba2f0c` test) via peer collision commit `f650a8ebd` ([HOOK-AUDIT]/forge-audit-v2 — title understates scope, swept the U-COORD06 files). Worktree dirs verified NOT junctions, yet files still reached the shared tree — same recurring pattern as [[reference_coord_ms0_u1_collision]] [[reference_coord_ms0_u4_collision]] [[feedback_conflict_fork_rule]]. Close-out commit: `49ee3c649`.

**Scrutiny:** per-file 2-agent gate ×3 rounds (banner 2 — PASS after T4→T2 + TTL-hint fixes; test 1 — PASS); end-of-task 3-of-3 PASS (arms A+B+C; ledger session `claude-1642fd87-u-coord06`).

**EXT (not git-tracked):** banner wired as the **last** SessionStart hook (post-zombie-reap → accurate session count) in `C:/Users/Mark Villanueva/.claude/settings.json` + mirrored `H:/.claude/settings.json`, timeout 2000ms, backup `settings.json.bak-u-coord06-1778762095`.

**Knobs:** `PRISM_COORD_BANNER_{DISABLE,STALE_MS,HINT_TTL_MS,SUMMARY_PATH,MARKER_PATH}`.

COORD-MS0 now **9/12** complete — pending: U-COORD02 (Optimistic Locking), U-COORD09 (Ambient Awareness Badge), U-COORD12 (Checksum Validation on Read). Companion to [[reference_u_coord05_hook_wiring]].
