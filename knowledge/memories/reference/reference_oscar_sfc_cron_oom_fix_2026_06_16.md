---
name: reference_oscar_sfc_cron_oom_fix_2026_06_16
description: SFC autonomous closed-loop cron was reporting ok=false — aggregate OOM'd because tsx injects a 384MB heap cap into child stages; fixed by childStageEnv strip+override (48GB) + installer hardening (slot:oscar, 2026-06-16)
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.700Z
aliases: reference_oscar_sfc_cron_oom_fix_2026_06_16
---


# SFC closed-loop cron aggregate-OOM fix + autonomous activation (2026-06-16, slot:oscar)

Operator work order (via /checkin-oscar): "reorientate to most recent sessions and continue in
engineered loops and harnesses and crons utilizing hermes agents and obsidian vault and ollama
offloading optimally." SFC base-model accuracy was already COMPLETE; this session hardened + validated
the **autonomous closed-loop cron** (`mcp-server/scripts/sfc-closed-loop-cron.mjs`, U-FT-CRON).

## The bug (live-diagnosed, not from a report)
A bounded end-to-end smoke-test of the cron showed `DONE ok=false`: the **aggregate** stage
(`sfc-aggregate.mjs`) crashed with a V8 heap OOM, which **cascaded** — triage + calib-sync skipped
("aggregate not ok") — so the whole self-learning loop reported failure. Aggregate materializes a single
milling regime's **~2.22M comparison objects** (126 shards x 17,640) in `merged.comparisons`.

**Root cause (the non-obvious part):** the cron runs UNDER tsx, and a tsx-launched node process has
`NODE_OPTIONS=--max-old-space-size=384` (a **384MB cap**) injected into its env — even when the shell's
NODE_OPTIONS is empty (verified: bash `echo $NODE_OPTIONS` = empty, but `tsx probe.mjs` shows HEAP_GB=0.42).
The cron spawned aggregate inheriting that 384MB cap -> instant OOM. My FIRST heap fix preserved the
inherited cap ("respect an existing --max-old-space-size") and was silently starved right back into the OOM.
This is why standalone `NODE_OPTIONS=--max-old-space-size=32768 tsx sfc-aggregate.mjs` SUCCEEDED (explicit
override) but the cron failed — the live end-to-end re-run (R15) caught what the standalone validation hid.

## The fix (commits on slot/oscar)
- `671bbc0a3c` U-FT-CRON-HEAP: `childStageEnv()` STRIPS any inherited `--max-old-space-size` and FORCES a
  generous heap (default **48GB**, knob `PRISM_SFC_CRON_HEAP_MB`); the knob is the override channel, NOT
  ambient NODE_OPTIONS. Wired into `runStep`'s spawn env. + main-guard + `export { childStageEnv }`
  (importable) + new vitest test + aggregate-header doc correction (real need ~32-48GB, not the old "8192").
- `e3426323e2` U-FT-CRON-INSTALL-HARDEN: installer `install-sfc-closed-loop-task.ps1` — admin-elevation
  probe; ExecutionTimeLimit 4h->10h (>= the cron's 6h sweep + six 30m stages = 9h worst case);
  prefer-main-tree cron path with worktree fallback+warning (durable task must not dangle); battery flags.
- `659dcd03b3` U-FT-CRON-P2: 3-of-3 scrutiny P2s — clamp non-positive knob (a negative knob made
  `--max-old-space-size=-5` which node silently ignores -> re-OOM), broaden strip regex to `=`/space/`-`/`_`
  forms, move -Uninstall before path resolution (no spurious warning).

## Validation (R15, LIVE)
Empirically (full 1,152-unit sweep, this host): aggregate **16GB OOMs / 32GB completes** all 42 regimes;
end-to-end cron **DONE ok=true** — aggregate OK 123s over all **20,321,280 cells**, every stage green.
childStageEnv branch probe all-pass; main-guard does NOT run main() on import. 3-of-3 scrutiny PASS.

## Lessons
1. **A "respect the inherited value" branch is wrong when the inherited value is a hostile ambient default.**
   tsx injects a 384MB cap; for a heavy stage the cap must be OVERRIDDEN, with the knob as the override channel.
2. **Validate the ACTUAL production path end-to-end, not a standalone proxy.** The standalone aggregate run
   masked the bug (it set NODE_OPTIONS explicitly); only the cron re-run exposed it. Also: a background
   task's exit code is the LAST command in the chain (a trailing `tail`), NOT the inner command — capture
   the real `$?` explicitly (I misread an exit-0 once).
3. **BUILD-FOR-BLACKWELL:** the gap was utilization (default heap), not capacity (136GB box). Generous heaps.

## Open / follow-ups
- **NOT YET REGISTERED on this host** — activation needs an ELEVATED run (operator step):
  `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-sfc-closed-loop-task.ps1 -RunNow`
  Best run AFTER the cron merges to main (so the durable task targets H:\PRISM, not the slot worktree).
- **Streaming `deriveBaseline`** (no full `merged.comparisons` array) is the deeper memory fix — a future unit.
- **Orphan:** `mcp-server/src/data/sfc-batch-units.ts` (+test) is untracked and duplicates the committed
  `enumerateWorkUnits` in `sfc-combinatorial-enumerator.ts` — NOT wired, do not commit; remove or ignore.
- **Fleet-wide note:** tsx injecting a 384MB cap could starve OTHER heavy node scripts run under tsx across
  the fleet — worth a separate audit (not oscar-scoped).
- This session ran with the **prism MCP bridge DOWN** (used CLI fallbacks throughout); the MCP-disconnect
  enforce hook blocked the first tool call of each ~3min episode (retried each time).

See [[reference_oscar_sfc_closed_loop_finish_2026_06_15]] · [[reference_oscar_sfc_fulltune_pipeline_2026_06_14]] · [[feedback_build_for_blackwell_hardware]].
