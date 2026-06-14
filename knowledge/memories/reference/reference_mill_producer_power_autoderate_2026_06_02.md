---
name: reference_mill_producer_power_autoderate_2026_06_02
description: "SHIPPED U-MILL-PRODUCER-POWER-AUTODERATE (commit 82c8352724) — opt-in power_autoderate makes MillingPrintToProgramEngine SELF-CORRECT over-budget courses (reduce ap to fit the spindle-power headroom budget) so the closed loop learns from FEASIBLE recommendations, not just flagged ones. Follow-on to U-MILL-PRODUCER-POWER-HEADROOM. Also fixed a chatter-stage passes precedence bug. 2 routed P2s."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.216Z
aliases: reference_mill_producer_power_autoderate_2026_06_02
---


# Mill producer power auto-derate shipped (foxtrot, 2026-06-02)

**Commit `82c8352724`** (U-MILL-PRODUCER-POWER-AUTODERATE / POST-TRAIN-MS0). Follow-on to [[reference_mill_producer_power_headroom_2026_06_02]]: that unit's gate *flagged* over-budget courses; this one makes the producer (`MillingPrintToProgramEngine`) **self-correct** them, so the closed loop (`MillCourseClosedLoopEngine` → OutcomeRLBridge → RL) learns from power-FEASIBLE recommendations.

## What it does
- **Opt-in** `MillingInput.power_autoderate` (default off → ZERO regression; mirrors the `sfc_ground`/`machine`/`tribal_ground` opt-in pattern). When an op's predicted cutting power exceeds the spindle-power headroom budget (`resolveMaxPowerKw(...) × SPINDLE_POWER_BUDGET_FRACTION` 0.85), reduce axial depth: `ap_new = max(AUTODERATE_MIN_AP_MM=0.2, ap × (0.97×budget / power))`, then recompute physics.
- **Physics (reviewer-confirmed exact):** power ∝ ap is LINEAR — Kienzle `Fc = kc1_1 × ap × fz^(1-mc) × K_ct`, and `ae`/`fz`/`K_ct`(=chipThinningFactor(ae,D)) are ALL ap-independent. So single-shot `ap × budget/power` lands power at the target exactly (no iteration). Targets `0.97 × budget` (`AUTODERATE_BUDGET_TARGET_FRACTION`) so the derated op lands inside the Stage-5 gate PASS zone, not on the warn boundary (defends against 2-decimal kW rounding).
- **Trades depth for passes:** `passes = ceil(feat.depth_mm / ap)`, so shallower ap → more passes → longer program (self-consistent; G-code recomputes passes from the final ap).
- **Honest fail-through:** floored at 0.2mm; if even the floor over-draws, the op stays at the floor and the Stage-5 power gate still flags it (warn/fail) — that machine genuinely can't run the cut. No absurd pass count manufactured.
- **Provenance (foxtrot soul, never silent, 3 surfaces):** `MillingPlannedOp.power_derate {from_ap_mm,to_ap_mm}` (structured, for the learner) + setup-sheet note + info-severity pipeline warning. Result `power_derated_ops` count (also in the emitP2POutcome RL summary).

## Key facts (for reuse)
- The derate is inline in the per-op loop (planProcess), BEFORE passes/cycle computation, so they reflect the derated ap. Ordering: derate (Stage 3) → chatter ap-reduction (Stage 3.5) → G-code (4) → power gate (5). Both ap reductions are monotone-downward; the gate sees the final ap (monotone-safe).
- `AUTODERATE_MIN_AP_MM` is EXPORTED (tests pin the floor). `AUTODERATE_BUDGET_TARGET_FRACTION` module-private. Both are CAM-derate POLICY fractions, not physics constants (so the "never inline physics constants" rule doesn't apply — explicitly annotated).
- Tests: `mill-power-autoderate.test.ts` (5 self-calibrated to realized peak power). 108 affected pass + 110 prior regression. Scrutiny: per-file 2-reviewer PASS (physics + independent), P0=0/P1=0.

## Fixed in passing (physics review found it)
- **Chatter-stage passes precedence bug** (`runChatterChecks`, was L1788): `ceil(depth_mm ?? newAp / ap)` — `??` binds looser than `/`, so it computed `ceil(depth_mm)` (passes == total depth in mm, ignoring ap). Parenthesized → `ceil((depth_mm ?? newAp) / ap)`. Corrupted `op.passes` telemetry on chatter-unstable ops (G-code was unaffected — it recomputes). The closed loop reads op.passes, so this is a real telemetry-fidelity fix.

## ROUTED follow-ups (pre-existing, P2 — do not re-discover)
1. **Chatter-stage cycle-time staleness:** when Stage 3.5 chatter reduces ap AFTER a derate, `op.cycle_time_sec` + `totalCycleTime` are NOT recomputed → reported cycle time can be stale (G-code correct; telemetry only). Recompute cycle_time in the chatter stage to match the new passes.
2. **mill_print_to_program schema↔engine `material` mismatch:** schema declares `material: z.string()` but the engine consumes `{material_name, iso_group}`. Pre-existing; the registered MCP handler would mis-shape `material` for a real string caller. Tests route via `engine.calculate(...)` (the dispatcher's actual route, same as `millDispatcher-print-to-program.test.ts`). Fix: discriminated object schema OR engine accepts string + resolves iso_group. Relates: [[reference_mill_producer_power_headroom_2026_06_02]] · [[mill-template-grounding-stack]].
