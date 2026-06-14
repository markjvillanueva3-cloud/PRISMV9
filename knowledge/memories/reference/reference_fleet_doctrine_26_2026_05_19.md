---
name: reference-fleet-doctrine-26-2026-05-19
description: "FLEET-DOCTRINE-26 shipped 2026-05-19 (golf, commit 57f28a1ad6) — 21-file doctrine + code drift sweep after SLOT_NAMES 13→26 expansion. Fixes P0 hardcoded-array drift in slot-bind-enforce.mjs + process-slot-map.mjs; updates CLAUDE.md (H:+C:) + 16 hooks/wiki entries via reusable scripts/fleet-doctrine-sweep.mjs."
aliases: reference_fleet_doctrine_26_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.114Z
---


**FLEET-DOCTRINE-26 shipped** (2026-05-19, slot golf, commit `57f28a1ad6`) — 21-file doctrine + code drift sweep closing the 13 → 26 fleet expansion that [[reference_slot_reclaim_2026_05_19|SLOT-RECLAIM]] started on the source-of-truth side.

**Why it mattered (P0 drift).** [[reference_slot_reclaim_2026_05_19|SLOT-RECLAIM]] expanded `SLOT_NAMES` in `chat-slots.mjs` from 13 → 26 (added `november..zulu`) but two helpers shipped their own hard-coded 13-name copies — `slot-bind-enforce.mjs` (drift-guarded for vitest-unloadable chat-slots.mjs) and `process-slot-map.mjs` ([[reference_fleet_reaper|fleet-reaper]]'s PID→slot classifier). Any chat in `november..zulu` would have been silently misclassified — exact recurrence of the 2026-05-16 10 → 12 drift whose DRIFT HISTORY comment block warned about this exact pattern. [[reference_fleet_reaper|Fleet-reaper]] would have considered november..zulu's node processes "unowned" → reapable.

**Sweep contents (21 files, commit `57f28a1ad6`):**
1. **Code (P0 fix):** 2 files — `slot-bind-enforce.mjs` + `process-slot-map.mjs` arrays expanded to 26, drift-history extended.
2. **Doctrine (manual):** `H:/prism/CLAUDE.md` 9 sections updated (PER-CHAT HANDOFF / PER-SLOT WRAPPERS / [[reference_session_continuity_stack_2026_05_15|SESSION CONTINUITY STACK]] / Fleet-design directive / Autonomous loop / GOLF SLOT / multi-host coexistence / [[reference_fleet_memory_monitor_2026_05_16|FLEET-MEMORY-MONITOR]] / JULIETT-12CHAT historical postscript).
3. **Doctrine (manual):** `C:/Users/wompu/.claude/CLAUDE.md` 2 sections (GOLF SLOT + multi-host) — auto-mirrored to H:/.claude/CLAUDE.md by c-to-h-mirror hook.
4. **Bulk script:** `scripts/fleet-doctrine-sweep.mjs` (new, +175 LOC) — reusable literal-phrase bulk-update with rule table; dry-run default, `--apply` writes, `--json` machine-readable. First run: 19/36 targets changed (8 hooks/helpers + 7 wiki + 1 docker README + 1 chat-slots.mjs + 2 already covered manually). Idempotent re-run: 0 residual.

**Doctrine — preserved vs updated.** Milestone names ([[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0, [[reference_fleet_memory_monitor_2026_05_16|FLEET-MEMORY-MONITOR]]-MS0) PRESERVED as canonical history with "superseded 2026-05-19" postscripts. Historical narrative sentences PRESERVED. Forward-doctrine sentences UPDATED to 26. Code-comment topology assertions UPDATED. Hardcoded arrays EXPANDED to 26 names.

**Acceptance.** `slot-bind-enforce.mjs` import → `SLOT_NAMES.length === 26` (tail `xray,yankee,zulu`). `node --check` both critical files PASS. `slot-reclaim.test.mjs` 47/47 (test was already designed for the 13→26 transition — its drift-guard comments explicitly mention "revert back to the 13-slot copy fails loud here"). Idempotent re-run of sweep script: 0 residual. Forward-grep across swept tree leaves only historical-narrative or `alpha..zulu` references.

**Tooling artifact — `scripts/fleet-doctrine-sweep.mjs`.** Per the dev-velocity compounding-gains tax: every forge run ships at least one reusable artifact. This sweep emits a script that re-runs cleanly for any future fleet-size change (26 → N) — change the rule table, dry-run, apply. The literal-phrase approach is intentional (regex would over-match; "13" is too generic). Skips milestone JSON, commit logs, `.pre-junction` backups.

**Lesson — drift-guard test must actually fire.** The drift between `chat-slots.mjs` and the two hardcoded consumers was supposed to be caught by `fleet-reaper.test.mjs`, but that test harness has been pre-existing-blocked (vitest transform bug) for weeks per CLAUDE.md §Recent regressions. A guard test that doesn't run is a guard that doesn't exist. Future drift-guards should use `node:test` directly (no vitest dep) and be wired to the Stop-hook regression bundle.

**See also.** Wiki [[fleet-doctrine-26]] · Source [[reference_slot_reclaim_2026_05_19]] (the milestone that expanded the source-of-truth) · Predecessor [[reference_fleet_reaper_ms1]] (documents the 2026-05-16 10→12 drift, exact same recurrence pattern).
