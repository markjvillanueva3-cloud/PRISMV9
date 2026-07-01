---
name: reference_oscar_orch_optimize_for_dead_slider_2026_06_25
description: SpeedFeedOrchestratorEngine DECLARED optimize_for but never consumed it -> the cost/balanced/productivity slider on SpeedFeedPage + CalculatorPage (sf_orchestrate) was DEAD (identical Vc/life). Fixed with a derate-only Vc factor (commit 49251eff15).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.692Z
aliases: reference_oscar_orch_optimize_for_dead_slider_2026_06_25
---


**SFC orchestrate optimize_for dead-slider fix (slot:oscar, 2026-06-25, commit `49251eff15` -- U-OSC-ORCH-OPTIMIZE-FOR-WIRE).** Found via live closed-loop testing of the SFC pages on :3100 (continuing the page-by-page calc-correctness sweep).

**Defect:** `SpeedFeedOrchestratorEngine` DECLARED `optimize_for` on its input type (line 231) but **NEVER consumed it** anywhere in `compute()`. So the cost/balanced/productivity goal selector on the two main SFC pages (`SpeedFeedPage` /speed-feed + `CalculatorPage` /calculator, both via `prism_calc:sf_orchestrate`) was DEAD -- live probe returned **byte-identical** Vc=300 / fz=0.1049 / tool_life=2min for cost, balanced, AND productivity. The customer moved the cost<->productivity slider and got the same numbers. (Schemas use `.passthrough()` so the field reached the engine; the engine just ignored it. Confirmed: `optimize_for` appeared ONLY at line 231 in the whole engine file.)

**Fix (DERATE-ONLY, Vc-only):** new `mcp-server/src/physics/optimize-for-factor.ts` -> `optimizeForVcFactor(goal): number` (<=1.0), applied as the LAST multiplier in the orchestrator Vc chain (`* optVcFactor`, ~line 2744). Table: `cost` 0.85, `tool_life` 0.80; balanced/productivity/time/surface_finish/undefined/unknown -> 1.0.
- **Why derate-only:** `MATERIAL_DB.vc_base` is a SINGLE carbide-anchored nominal per material (NOT a [low,nominal,high] band), so there is no published-safe upper point to move toward; RAISING Vc above the nominal is the un-safe-leaning direction this engine deliberately avoids (mirrors `toolMaterialSpeedFactor`'s `Math.min(1.0,...)` posture + PRISM_SFC_CONVERGE Vc gating). cost/tool_life DERATE; productivity stays = balanced (raising it is operator-gated, recommended separately).
- **Grounding:** Taylor tool-life economics -- minimum-cost Vc ~ 0.8-0.85x max-production Vc for carbide (n~0.25); tool_life is the steeper derate (lower Vc -> longer life, T=(C/Vc)^(1/n)). Boothroyd & Knight; Kalpakjian.
- **Live-confirmed numbers (reviewer probe):** balanced Vc 300/life 2min; cost Vc 255/life 4min; tool_life Vc 240/life 5min; productivity==balanced. Touches NO canonical Kienzle/Taylor constant -> S(x) monotonically non-degrading (lower Vc -> lower power, longer life). 64/64 existing orchestrator regression tests green (default path bit-identical).

**Two bugs caught DURING the build (investigate-before-ship):** (1) my first cut used a `{vc, fz}` object table indexed by a plain object -- `OPTIMIZE_FOR_FACTORS["toString"]` resolved to `Object.prototype.toString` (a function) -> `Math.min(1.0, fn.vc)` = **NaN** (prototype pollution; an adversarial test caught it -> fixed with `Object.create(null)` + `Object.hasOwn`). (2) the `surface_finish` fz reduction (Ra~fz^2) was OVERRIDDEN downstream -- the output `feed_per_tooth` is re-derived by chip-thinning + the `U-SFC-DEFLECTION-VC-LEVER` feed lever, so a raw-fz multiplier at fz-base is washed out. Scoped surface_finish OUT (-> neutral 1.0, a documented follow-up; the real finish lever must apply AFTER fz finalization).

**Lesson:** a declared-but-never-consumed input field is a silent dead feature -- grep the engine body for EVERY consume site of a declared input, not just the declaration. A plain-object lookup keyed by user input is a prototype-pollution NaN trap (use null-proto + Object.hasOwn). And a factor applied at an EARLY stage (fz-base) can be silently overridden by a later re-derivation -- verify the factor reaches the OUTPUT.

**FOLLOW-UPS (queued, NOT done):**
1. `surface_finish` fz lever -- apply AFTER fz finalization (post chip-thinning + deflection re-derive) for real Ra~fz^2 reduction.
2. **P2 (pre-existing, flag-off-safe):** under `PRISM_SFC_CONVERGE=1`, the adapter `orchestrator-input-adapter.ts:36 mapOptimizeFor` collapses `cost` -> `"balanced"` for the delegate (UltimateSpeedFeedEngine), so the cost slider would no-op on the flag-ON path. CONVERGE is OFF by default so the live pages this fix targets are unaffected; fix the adapter mapping if/when CONVERGE is armed. Relates to the operator-gated PRISM_SFC_CONVERGE decision.
3. Operator-gated: making `productivity` RAISE Vc above nominal (so productivity > balanced) -- a customer-facing published-Vc increase.

Complements the existing `sfc_calculate` optimize_for slice ([[reference_post_ship_sfc-optimize-for-u-sfc-optimize-for-request]] + UI) which wired the OTHER engine (ProductEngine). See [[reference_oscar_sfc_blocked_gate_surface_2026_06_25]] (sibling SFC-page closed-loop finding this session).
