/**
 * optimize_for cutting-speed factor for the SFC orchestrator (U-OSC-ORCH-OPTIMIZE-FOR-WIRE).
 *
 * PROBLEM (verified live on :3100, 2026-06-25): `SpeedFeedOrchestratorEngine` DECLARED
 * `optimize_for` on its input type but NEVER consumed it, so the cost <-> productivity goal
 * selector on the SFC web pages (`SpeedFeedPage` /speed-feed, `CalculatorPage` /calculator, both
 * via `prism_calc:sf_orchestrate`) was DEAD: `optimize_for` = cost / balanced / productivity all
 * returned byte-identical Vc / fz / tool_life. This module is the single source of the goal->Vc
 * factor so the slider becomes functional.
 *
 * DERATE-ONLY BY DESIGN (factor `<= 1.0` always). The orchestrator's `vc_base` is a single
 * CARBIDE-anchored nominal value per material (`MATERIAL_DB.vc_base`), NOT a [low, nominal, high]
 * band -- so there is no published-safe upper point to move toward. RAISING the headline Vc above
 * that conservative nominal is the un-safe-leaning direction this engine deliberately avoids (see the
 * `toolMaterialSpeedFactor` `Math.min(1.0, ...)` note in `SpeedFeedOrchestratorEngine`, and the
 * PRISM_SFC_CONVERGE Vc gating). Therefore:
 *   - productivity / time / balanced / surface_finish / undefined / unknown -> 1.00
 *       (nominal ceiling unchanged; the default recommendation is preserved EXACTLY)
 *   - cost                                                                  -> 0.85
 *   - tool_life                                                             -> 0.80
 *
 * GROUNDING (literature, not arbitrary): Taylor tool-life economics -- the minimum-COST cutting
 * speed is ~0.75-0.85x the maximum-PRODUCTION-rate speed for carbide (Taylor exponent n ~ 0.25), so
 * `cost` 0.85 and the steeper `tool_life` 0.80 (maximize life) sit in that band. (Boothroyd & Knight,
 * Fundamentals of Machining; Kalpakjian, Manufacturing Processes.) Lower Vc -> longer life via
 * `T = (C / Vc)^(1/n)`.
 *
 * SCOPE NOTES (R12 -- honest about what this does NOT do):
 *   - VC ONLY. The `feed_per_tooth` output is re-derived downstream (chip-thinning + the
 *     deflection-driven feed lever, U-SFC-DEFLECTION-VC-LEVER), which OVERRIDES a raw fz multiplier
 *     applied at fz-base. So a `surface_finish` fz reduction (Ra ~ fz^2) cannot be delivered here --
 *     it needs to be applied AFTER fz finalization. Left as a follow-up; `surface_finish` therefore
 *     maps to the neutral 1.0 for now (no change vs balanced -- never a regression).
 *   - Making `productivity` EXCEED `balanced` (a Vc RAISE above nominal) is a customer-facing
 *     published-Vc increase in the un-safe-leaning direction -- OPERATOR-GATED (recommended
 *     separately, NOT auto-applied here), consistent with how this engine already gates Vc raises.
 */

/**
 * Canonical goal -> Vc multiplier table. Only the unambiguous, engine-honored derates are listed;
 * every other goal (incl. balanced/productivity/surface_finish) falls through to the neutral 1.0.
 * `time` is a synonym for `productivity` (the mill action schema uses `time`).
 *
 * Built with a null prototype so an inherited Object key (`toString`, `constructor`, ...) can never
 * resolve to a spurious factor (caught by the adversarial unit test).
 */
export const OPTIMIZE_FOR_VC_FACTOR: Readonly<Record<string, number>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, number>, {
    cost: 0.85,
    tool_life: 0.8,
  }),
);

/**
 * Resolve the cutting-speed multiplier for an `optimize_for` goal.
 *
 * @param goal the requested goal (`cost` | `tool_life` derate; `balanced` | `productivity` | `time`
 *   | `surface_finish` | `undefined` | unknown -> the neutral 1.0, no change).
 * @returns a Vc multiplier clamped to `<= 1.0` so the headline Vc is NEVER raised above the
 *   conservative nominal (the load-bearing safety invariant; mirrors
 *   `getMaterialSpecificToolSpeedFactor`'s `Math.min(1.0, ...)` clamp).
 */
export function optimizeForVcFactor(goal: string | undefined | null): number {
  // Object.hasOwn guards against inherited-property pollution even though the table already has a
  // null prototype (defense-in-depth: a future refactor to a plain object stays safe).
  const factor = goal && Object.hasOwn(OPTIMIZE_FOR_VC_FACTOR, goal) ? OPTIMIZE_FOR_VC_FACTOR[goal] : 1.0;
  return Math.min(1.0, factor);
}
