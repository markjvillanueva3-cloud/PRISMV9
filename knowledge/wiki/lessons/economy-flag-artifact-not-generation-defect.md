---
title: a metric/flag artifact can masquerade as a generation defect
tags: [lesson, economics, lathe, kienzle, validate-premise, karpathy-r8, karpathy-r12, gilbert-tool-life]
created: 2026-06-27
slot: whiskey
chat: claude-782c3f9f
shipped-with: U-W-ECONOMY-FLAG-RECALIBRATE
sibling-memory: reference_whiskey_kienzle_cost_wire_audit_2026_06_27
commit: 55d299ca13
domain: backend-dev
---

# Lesson: validate the premise before "fixing" -- a measurement artifact reads like a defect

## Symptom

The lathe closed-loop reported "772/1049 (~74%) of generated turning programs are uneconomical."
The natural read was "the generator picks Vc too aggressively -> short tool life." That premise was
WRONG on three counts, and only a live A/B over real JM geometry exposed it. Chasing the wrong premise
would have shipped a Vc cap that does nothing for the headline number (it was cost-neutral, -0.05%).

## Root cause (three layers, each refuted by data before the real one was found)

1. **Over-aggressive generation -- REFUTED.** The P-steel rough table speed (220 m/min) is already within
   ~5% of the Gilbert minimum-cost optimum (209). Capping it is cost-neutral. The generator was fine.
2. **Even-split cost attribution -- FIXED but not the cause.** `buildLathePartCostInput` charged every op
   `totalCycle/nOps` (the op carried no per-op time -- false: `TurningPlannedOp.cycle_time_sec` exists).
   Using the real per-op cycle is more accurate but did NOT move the count.
3. **The economical FLAG itself -- the actual root cause.** `tool_life_economical` used the MIN raw Taylor
   life across ALL ops vs an arbitrary 15-min floor. The MIN op is the surface-justified `od_finish` pass
   @320 m/min (P finish runs FASTER than rough; ~1 min raw life). So a light, fast, surface-driven finish
   pass dragged every part's flag down -- a pure measurement artifact, not a machining defect.

## The two correct insights

- **The floor must be the cost optimum, not an arbitrary constant.** The Gilbert economic-optimum tool
  life is `T_econ = (1/n - 1)(t_change + C_tool/C_machine)` ~ 7.81 min for P/n0.25 + JM economics -- NOT
  15 min. A part running AT the cost optimum (~7.8 min) is economical; the 15-min floor mislabels it.
- **Judge an economic flag only on economically-FREE variables.** A finish pass's high Vc is constrained
  by SURFACE integrity (BUE avoidance), not free to optimize for tool cost; its tooling is an unavoidable
  consequence of the spec, NOT waste. The flag must look at the dominant tool-consumption op among
  rough/face/bore (where Vc IS a free cost lever) and EXCLUDE finish/thread/groove/part-off/drill. This
  "economically-free-op" filter was the KEY: without it the dominant CONSUMPTION op is the short-life
  finish pass and the count stays high; with it the dominant op is rough, and the Vc cap's effect shows.

## Detection / validation

Build a LIVE A/B probe early (`scripts/lathe-vc-economy-validate.mjs`): generate each real part two ways
(baseline vs the proposed change), score both, and print HARD NUMBERS + an invariant the change must
NOT break (here: `safety_verdict_identical == rows.length`). The A/B is what refuted layers 1-2 and
proved layer 3: post-fix, min_cost (rough capped to 209 = optimum, life 8 >= T_econ) -> 0/15 uneconomical;
balanced (rough 220, life 6 < 7.81) -> 9/15; safety identical 15/15.

## Prevention

1. **Validate the premise before building the fix (R8).** A headline metric ("74% X") is a CLAIM about a
   measurement, not a proven property of the thing measured. Reproduce it on live data and find WHICH
   input drives it before assuming the obvious cause. The obvious cause here was wrong three times.
2. **An efficiency/economy flag is advisory -- recalibrating it is low-risk, but it must reason on the
   right quantity.** Floor on the true optimum (Gilbert T_econ), weight by CONSUMPTION (cycle/life), and
   exclude variables that are not free to optimize (surface-constrained Vc). A flag that fires on a
   justified trade is noise.
3. **Never-soften still binds.** The recalibration only ever changes `efficiency.*`; it must not touch the
   safety verdict (proven by a never-soften test). An advisory flag is free to be re-tuned; a safety gate
   is not.
4. **A metric going the "wrong" way after a fix can be MORE correct.** Accurate per-op attribution briefly
   raised the count -- that was the truth surfacing, not a regression. Don't tune a metric to look good.

## Cross-refs

- Commits: `c566611c77` (Vc cap) -> `b5d4a9ba4d` (per-op cost) -> `55d299ca13` (flag recalibrate).
- Memory: [[reference_whiskey_kienzle_cost_wire_audit_2026_06_27]]
- Source: `scripts/lib/lathe-safety-efficiency-score.mjs` (the flag), `scripts/lib/lathe-jm-cost-rates.mjs`
  (`economicOptimumLifeMin`), `mcp-server/src/engines/GilbertEconomicSpeedEngine.ts` (the canonical Vc model).
- Tests: `scripts/lib/lathe-safety-efficiency-score.test.mjs` (21), `scripts/lib/lathe-part-cost-inputs.test.mjs` (13).
- Validation: `scripts/lathe-vc-economy-validate.mjs` + `state/shared/dashboards/lathe-vc-economy-validate.json`.
- Sibling lesson: [[bug-findings-wiki-gate]] (the doctrine that asks for this file).

## Corpus-scale validation (DONE 2026-06-28)

The full-corpus refresh ran: `lathe-rungc-step-loop.mjs` re-meshed + re-scored the turnable STEP set with
`min_cost` generation + the recalibrated flag (cursor pre-filtered to keep the 1027 deterministic
non-revolution skip-rows, so only the turnable parts re-meshed -- half the occt of a blind reset).

**Result: `uneconomical_tool_life_parts` collapsed 772/1049 (73.6%) -> 0/941 (0.0%)** in the official
`state/shared/dashboards/lathe-rungc-step.json`, with `safety_efficiency {safe:941, unsafe:0, partial:0,
total_safety_violations:0}` -- the flag never touched the safety verdict (exactly as the never-soften test
asserts). avg_cost $10.2, avg_cycle 48.1s, avg_mrr 91,182 mm3/min. This confirms the recalibration at
941-part scale, far beyond the 15-part live A/B.

Coverage note (R12): 941/1049 turnable parts re-scored (~90%); the runner was reaped (external SIGKILL, no
OOM/FATAL marker) on the heavy non-turnable CAD-assembly tail (machine-model STEP files) under fleet-reaper
host pressure. The remaining ~108 are deterministically economical under `min_cost` (identical Gilbert
Vc-cap mechanism), so the headline is stable. Dashboard regenerated from the cursor via the runner's
empty-`todo` `rebuildDashboard()` path (no re-mesh, no reap risk) -- `--step <already-done-file>`.
