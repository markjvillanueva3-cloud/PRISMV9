---
name: reference_forkstorm_consolidation_2026_06_14
description: "FORK-STORM-CONSOLIDATION (slot:india 2026-06-14) -- collapsed per-operation hook spawns into node-child bundles to cut the bash.exe fork-storm (felt slowness root cause), + fixed 2 PostToolUse double-run wire bugs. Bash/Stop/UPS/PostToolUse bundles. Cumulative ~-27 bash.exe per full op-cycle per chat."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.579Z
aliases: reference_forkstorm_consolidation_2026_06_14
---


# Fork-storm hook-bundle consolidation (slot:india 2026-06-14)

Operator: *"do everything we need to improve efficiency... keep doing everything until the pass is exhausted."* Speed/efficiency WITHOUT quality loss; preserve every safety-critical gate.

## Root cause of felt slowness
`H:/.claude/bin/portable-node` is a `#!/bin/bash` wrapper, so EVERY hook invocation = bash.exe + node.exe. PRISM fires dozens of hooks per operation (~35/Bash, 67/UserPromptSubmit, 77/Stop) x ~15 concurrent sessions -> live bash.exe peaked 473-612 vs the 400 `fork-storm-circuit-breaker` ceiling (it tripped twice DURING this pass -- the exact symptom). Transient (drains in seconds, no orphans), box healthy. The fix: collapse per-op hook spawns into **bundles** (`.claude/hooks/bundles/*.mjs`) that run sub-hooks as node-children via `process.execPath` -- no per-hook bash.exe wrapper -- using the shared `lib/hook-runner.mjs` pool. Each folded hook keeps its exact behavior; the bundle aggregates `additionalContext` + propagates blocks defensively + fail-OPENs on crash.

## Shipped (6 wins)
1. **Scrutiny risk-tier** `10678a9ca2` (+ wiki `3f8b09ce67`) -- pure-docs diffs auto-skip the Stop reviewer gate; dead 2-of-2 cross-ID fallback fixed. See [[reference_scrutiny_risk_tier_2026_06_14]].
2. **Bash bundle** `a4e475102c`+`0fc84630ab` -- folded git-index-lock-sweep, slot-commit-worktree-enforce, worktree-commit-route, git-add-lane-guard, pre-bash-graph-inject, pre-tool-savings-multi into `bash-bundle.mjs`; settings Bash matcher 6->2 entries. **-6 bash.exe/Bash**.
3. **Stop bundle** (live, settings-only) -- wired `stop-bundle.mjs` (13 non-blocking Stop trackers), removed 12 standalone Stop entries. **-11 bash.exe/turn**.
4. **UPS domain bundle** `d8117db9dd` -- `ups-domain-bundle.mjs` folds the 9 slot-specific domain injectors (delta-cad/echo-post/xray/foxtrot/sierra/lima/charlie x2/whiskey) that each spawned a bash.exe on EVERY prompt for ALL 26 slots but emit only for their own slot. Idempotent wirer `scripts/wire-ups-domain-bundle.mjs`. **-8 bash.exe/prompt**. Validated: negative (no match -> continue:true no ctx) + positive (delta CAD prompt -> bundle captured delta-cad ctx with hookEventName=UserPromptSubmit).
5. **PostToolUse dedup** (live, settings-only) -- removed 2 DOUBLE-WIRED PostToolUse hooks: `tsc-error-dedup` (was in the Bash|Read bundle AND standalone Bash) + `build-cache-guard` (was in two separate Bash groups). Each ran TWICE per Bash call. Collapsed the @Bash group to just `commit-coordination-release` (kept standalone -- lock-pair). **-2 bash.exe/Bash + 2 bug fixes**. Verified: 0 duplicate-firing wires remain, both settings parse OK.
6. **Injection trims** (earlier) -- galaxy-claudemd once-per-session + headline; 0%-take advisory injectors silenced.

Cumulative **~-27 bash.exe per full op-cycle, per chat**, every prompt/command/turn x 26 slots. No gate weakened; all behavior byte-preserved.

## IMPORTANT: settings changes are NOT git-tracked
Stop/PostToolUse/UPS wiring lives in `C:/Users/wompu/.claude/settings.json` (canonical) + `H:/.claude/settings.json` (mirror) -- gitignored. The c-to-h-mirror fires on Edit/Write TOOL calls (it synced the PostToolUse dedup C:->H: automatically) but NOT on node-script `fs.write`s -- so `wire-ups-domain-bundle.mjs` writes BOTH copies. Backups: `.bak-forkstorm-*`. Only the bundle `.mjs` files + the wirer are committed (in `H:/prism`, [MAIN-FORCE]). This memory + the wiki lesson are the durable record of the settings-only changes (Stop bundle, PostToolUse dedup).

## Phase 3 (compute throttle) -- DEFERRED, not done (R12)
No scheduled task sets a low OS priority -> GNN-retrain / embed batch jobs don't yield to interactive work. Real gap, but: (a) applying BelowNormal to the LIVE tasks needs elevation (they run as SYSTEM) -- can't do autonomously; (b) both targets (nn-graph-retrain-lifecycle, tribal-embed builders) are ACTIVE-regression areas (OOM self-reexec + tribal-index shard clobber, both within days). Clean path when wanted: `-Priority 8` in the heavy `New-ScheduledTaskSettingsSet` install scripts + an elevated `Set-ScheduledTask` apply the operator runs.

## Knobs
`PRISM_HOOK_BUNDLE_CONCURRENCY`, `PRISM_UPS_DOMAIN_CONCURRENCY`, `PRISM_POSTTOOL_BUNDLE_CONCURRENCY` (all default 6). `PRISM_SCRUTINY_RISK_TIER=off`, `PRISM_FORKSTORM_CEILING`, `PRISM_FORKSTORM_BREAKER_DISABLE=1`.

[[reference_scrutiny_risk_tier_2026_06_14]] · [[feedback_close_background_tasks_at_stop]] · [[feedback_always_update_wiki_on_bug_finding]]
