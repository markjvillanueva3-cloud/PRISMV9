---
name: reference_loop_unbounded_all_galaxies_2026_06_17
description: "The /loop autonomous-work iteration cap is UNBOUNDED fleet-wide for all galaxies (per-unit target + roll-chain both 1e9); safety is the spiral/stuck/token/fail-streak guards, NOT a count. Where every cap + knob lives."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_loop_unbounded_all_galaxies_2026_06_17
---


# /loop iteration cap REMOVED fleet-wide for all galaxies (slot:bravo, 2026-06-17)

Operator directive 2026-06-17: "remove the iteration cap permanently for all galaxies; update the
system and settings to fully accommodate." A galaxy /loop now auto-advances UNBOUNDED -- it stops on a
genuine SPIRAL, never on a healthy iteration/roll count (R6: count/context growth is NOT a stop signal).

## The two count-based caps (both now 1e9 = unbounded) — `H:/prism/.claude/helpers/loop-state.mjs`
1. **Per-unit target** — `DEFAULT_TARGET = Number(env.PRISM_LOOP_DEFAULT_TARGET) || 1_000_000_000` (line ~45;
   shipped U-LOOP-UNBOUNDED). How many `tick`s one unit runs before the loop "completes."
2. **Roll-chain** — `DEFAULT_MAX_ROLLS = 1_000_000_000` (line ~360; shipped U-LOOP-UNBOUNDED-ROLLS, was 8).
   How many UNITS a /loop auto-advances through (a roll resets per-unit iter, so this is the only
   count bound on total units). `maxRolls()` reads `PRISM_LOOP_MAX_ROLLS` as the override.
   Also fixed: the roll-path target fallback `|| 20` -> `|| DEFAULT_TARGET` (line ~422, stale residual).

## Settings (C: -> H: mirrored, fleet-wide / all 26 galaxies)
`C:/Users/wompu/.claude/settings.json` env block:
- `PRISM_LOOP_MAX_ROLLS = "1000000000"`  (explicit unbounded roll-chain)
- `PRISM_LOOP_DEFAULT_TARGET = "1000000000"`  (explicit unbounded per-unit target)
- (pre-existing) `PRISM_FORCE_LOOP_BLOCK = "1"` enables the Stop-hook force-continue.

## SAFETY IS PRESERVED — "unbounded" != "uninterruptible" (2-arm scrutiny PASS, audited)
A /loop still STOPS on a spiral via these UNTOUCHED guards (none gate on roll/iter count):
- `decidePlanningAction` exhaustion-stop + `MAX_REPLANS`(3) demote-to-stop on a persistent FAIL streak
  (`scripts/lib/planning-loop.mjs` + `deriveLoopSignals` consecutiveFails, carried across rolls via replanLog).
- force-loop hook (`stop-force-loop-continue.mjs`): no-progress STUCK detector (`progressGate`/STUCK_LIMIT=3
  releases a wedged loop) + TOKEN_CEILING (releases >=90% context for compaction).
- per-unit `iter > target * 2` runaway abandon (`loop-state.mjs:201`) still fires for an explicit finite `--target`.
- `MAX_REINJECT`(PRISM_FORCE_LOOP_CONTINUE_MAX=3) bounds ONLY the advisory handoff-note append, NOT the
  enforcement (the hook comment says so explicitly) -- so it is NOT a completion cap, left as-is.

## To RE-IMPOSE a finite bound (if ever wanted)
Set `PRISM_LOOP_MAX_ROLLS=<n>` and/or `PRISM_LOOP_DEFAULT_TARGET=<n>` (fleet) or pass `/loop <n>` /
`--target <n>` (per-loop). Numerical SOLVER convergence bounds (SimulatedAnnealing/PageRank/Bayesian
maxIterations) + AgenticLoopEngine.maxIterations are SEPARATE per-call bounds and were NOT touched
(unbounding them would break convergence). Tests: `.claude/helpers/loop-state.test.mjs` (5/5, incl 2 R9
roll-cap teeth). Related: [[feedback_context_growth_not_a_stop_signal]] · [[reference_loop_auto_advance_2026_06_08]].
