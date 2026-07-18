---
name: fabricated-output-placeholder-defect-class
description: A hardcoded placeholder/magic value that flows into a RETURNED or EMITTED engine output (feed, G-code, cost, cut-time) without being overwritten -- the silent-fabrication bug class, how to detect it, how to fix it (R12).
type: lesson
tags: [audit, fabricated-output, placeholder, R12, validity, stub-hunt, engine-audit]
source: ENGINE-ALGORITHM-FORMULA-AUDIT-2026-06-19 (slot:bravo)
---

# Fabricated-output placeholder defect class

A **fabricated-output defect** is a hardcoded placeholder / magic literal that **flows into a value the engine RETURNS or EMITS as shipped output** (a feed rate, a G-code field, a cost/quote, a cut-time, a force) **without being overwritten by a real value**. The engine *looks* like it computed the number; it actually fabricated it. This is the sibling of the no-stub rule, applied to *outputs* instead of whole engines, and a direct R12 (fail-loud) violation: a fabricated number presented as exact is a lie.

Found 3 real instances in one fleet-wide audit (2026-06-19), all now fixed:

| Engine:line | Fabricated value | Flowed into (shipped output) |
|---|---|---|
| `ToolpathForceProfileEngine` (generateModulations) | `originalFeedrate = 1000` | every `feedrate_modulations[].original_feedrate` + `recommended_feedrate` |
| `WEDMCalculatorAIEngine:433` | `pathLength = 100` | every `passes[].cutting_time_min` + `predicted_cycle_time_min` |
| `LatheOpusReasoningEngine` (calculateCostEfficiency) | `cycleTimePerPart = 5` | returned `cost_per_part` + `efficiency_score` (latent: method not yet dispatcher-wired) |

## Detection (two-stage; do NOT stop at the grep)

1. **Enumerate candidates** — `grep -rnE '=\s*[0-9.]+;?\s*//.*placeholder|// *placeholder'` over the engine tree (also `// TODO`, `// FIXME`, magic returns). This is the *candidate* list, not the finding list.
2. **TRACE each value's flow (the load-bearing step, R12 "read the body, not the marker")** — does the value reach a `return`/emit site as-is, or is it overwritten / documented-filled-downstream? Only a value that reaches shipped output un-overwritten is a real defect.

### Benign patterns that look guilty but are NOT (verified this audit)
- **Filled downstream**: `EndToEndPipelineEngine` emits `S0 M03` then `assembleProgram` does `.replace("S0 M03", "S<rpm> M03")` with the real rpm. The comment "filled in assembly" was true -- verify the fill site exists.
- **Field never read**: `CollisionPreventionEngine` sets `body_type:"stock"` on the tool-assembly AABB, but overlap checks read the *obstacle's* `body_type`, never the assembly box's -> harmless mislabel.
- **Code-generator templates**: `CodingCopilotEngine` / `AutoForgeEngine` emit `// TODO`/`status:"not_implemented"` *into generated code* -- not a stub in the engine itself.
- **Documented caller-supplied sentinels**: `CADFileClassifierEngine` `fileId:"0".repeat(64)` with "caller supplies real fileId downstream".
- **Stochastic/NN/RL `Math.random`**: Box-Muller sampling, He/Xavier weight init, RL epsilon-greedy -- legitimate, not fabricated physics.

## Fix pattern (additive, non-breaking, R12-honest)

When the real value is **already in scope** (e.g. the feedrate was in `input.segments`): just read it -- pure plumbing, with a fail-safe (`if undefined continue`, never fabricate).

When the real value is **NOT in scope** (needs caller geometry):
1. Add an **optional** input field (e.g. `cut_length_mm?`, `cycle_time_min?`) -- additive, no breaking contract change.
2. Replace the magic literal with a **named, documented constant** (`DEFAULT_ESTIMATE_PATH_LENGTH_MM`) so the assumed value can't drift and is greppable.
3. When the fallback is used, **surface the uncertainty** (R12): push a `warnings[]` entry, lower a `*_confidence` field, and/or add an additive `*_is_estimate: boolean` -- never present the estimate as exact.
4. Guard with `x && x > 0` (rejects `0`/negative/`NaN`) before any divide.
5. **Test the intent** (R9): a linearity/scaling invariant proves the real input is used -- e.g. `cutting_time(500mm) == 5 * cutting_time(100mm)` fails the instant the bug reverts to a constant.

## Why it matters
These outputs feed real decisions: feed-modulation recommendations, WEDM/lathe **quotes** and cycle-time estimates. A fabricated cost or cut-time corrupts a quote; a fabricated feed corrupts a machining recommendation. Surfacing the estimate (low confidence + warning) lets the consumer decide; silently fabricating does not.

## Related
- [[feedback_wire_test_validate_all_galaxies]] (R15) -- wire+test+validate
- The no-stub-engine rule -- this is its output-level analogue
- `state/shared/specs/ENGINE-ALGORITHM-FORMULA-AUDIT-2026-06-19.md` -- the source audit
