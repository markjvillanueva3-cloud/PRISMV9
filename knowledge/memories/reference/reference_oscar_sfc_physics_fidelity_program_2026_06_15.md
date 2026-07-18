---
name: reference_oscar_sfc_physics_fidelity_program_2026_06_15
description: SFC PHYSICS-FIDELITY program (2026-06-15, slot:oscar) -- make PRISM cutting data MORE accurate than G-Wizard/HSMAdvisor by physically modeling EVERY SFC input. 6-agent citation-grounded gap map + dependency-ordered build queue. Spec at mcp-server/state/sfc-physics-fidelity/SFC-PHYSICS-FIDELITY-MAP-2026-06-15.md (commit a866edf2fc, U-PF-MAP). Split-brain two-engine finding + the inline_compat short-circuit root cause + the base-table-is-premium-coating-tabulated double-count-prevention insight.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_physics_fidelity_program_2026_06_15
---


# SFC PHYSICS-FIDELITY program (2026-06-15, slot:oscar)

Operator: "give more accurate cutting data than gwizard and hsmadvisor relative to the physics,
thermodynamics, metallurgy, cutting forces... from toolpaths, cutting material, stock materials,
coatings, air, air blast, MQL, flood coolant, mist, thruspindle, machines, spindles... all inputs
possible for our sfc page." Ultracode ON. The base-model accuracy work the catalog-compare bias
report flagged (PRISM under-speeds finishing -16..-71%, over-speeds S-roughing +37% vs OEM catalog).

## What shipped this turn (commit `a866edf2fc`, U-PF-MAP)
Exhaustive 6-agent citation-grounded audit -> durable program spec at
`mcp-server/state/sfc-physics-fidelity/SFC-PHYSICS-FIDELITY-MAP-2026-06-15.md`. NOT a code change yet --
the "understand + plan" phase done right (R8 read-before-write, R13 logical order).

## Three load-bearing findings
1. **Split-brain: TWO live SFC engines.** `UltimateSpeedFeedEngine.ts` (.calculate, dispatcher :5254 +
   material-aware delegate :1565 -- the catalog-compare/bias-report harness engine, the WEAKER one) vs
   `SpeedFeedOrchestratorEngine.ts` (.compute, :6688, "central", richer: hardness->kc, real power/torque
   clamp, 1058-machine spindle torque curve). Resolution = canonical constants in physics/constants.ts
   consumed by BOTH (R7 canonicalize, don't blend; don't fork a 3rd table).
2. **Root cause = `inline_compat:true` Taylor short-circuit** (UltimateSpeedFeedEngine.ts:1146-1153 ->
   ExtendedTaylorModel.ts:280) returns BEFORE the correction stack -> coolant/coating/hardness/temp
   corrections never apply. Needed physics already exists as DEAD tables: `ISO_SUBGROUP_KC1`
   (:727, never called), `EXTENDED_TAYLOR_BY_TOOL` (constants.ts:985), `COOLANT_MULTIPLIERS`
   (ExtendedTaylorModel.ts:166), `machine-torque-curves.ts` (1058 machines, only Orch uses it). WIRE,
   don't re-derive.
3. **CRITICAL double-count-prevention (validate-before-edit caught this):** `BASE_PARAMS`
   (UltimateSpeedFeedEngine.ts:823-859) is PREMIUM-COATING + COOLANT tabulated PER REGIME (P/M/S=AlTiN/
   flood, K=Al2O3/CBN/dry, N=uncoated/mist). So coating-vc & coolant-vc factors MUST be RELATIVE to
   `baseParams.coatings[0]`/`baseParams.coolant` (factor=1.0 when user==assumed -> default calls
   byte-identical), NOT a global TiAlN=1.0 multiplier (which would double-count the baked-in coating).
   This is WHY PRISM is well-calibrated for the default right-tool case but can't adjust to a different
   coating/coolant selection.

## Gap matrix (all 6 HIGH severity; file:line in the spec)
substrate->vc 3-10x (HSS@carbide=DANGEROUS) | hardness->vc/kc 30-40% + BUG-B | coating->vc +20-50% ferrous |
coolant regime +10-25% vc/30-50% life (operator MOST emphasized, hardest -- touches inline_compat) |
machine/spindle torque-curve clamp (port from Orch) | toolpath chip-thinning->feed (finishing-underspeed root, verdict still open).

## Build queue (dependency-ordered; each: canonical constants -> wire Ultimate first -> physics-review ->
2-reviewer scrutiny -> re-run bias-report as acceptance test)
TIER1 (vc multipliers, no inline_compat, low churn): U-PF-SUBSTRATE (safety-first) -> U-PF-COATING ->
U-PF-HARDNESS. TIER2 (correction stack): U-PF-COOLANT -> U-PF-COATING-THERMAL. TIER3 (machine, port
Orch code): U-PF-SPINDLE -> U-PF-CHATTER-CLAMP -> U-PF-RUNOUT-FLOOR. Cross-cut: U-PF-BUGB (fail-loud
unknown-material), U-PF-TOOLPATH-THINNING, U-PF-RECONCILE (kill split-brain).

## Validation closes the operator's loop
After each unit, re-run `npx tsx scripts/sfc-catalog-compare.mjs` -> bias-report.md: vc bias should move
TOWARD 0 vs OEM (not overshoot into over-speed, esp. NOT on S/heat-sensitive). The bias-report IS the
acceptance test. Soul rails: physics-review-agent on force/stability/Taylor edits; verify-vendor-parity
before publishing; never inline constants; never soften thresholds; re-baseline fixtures only after
confirming the move is physically correct. See [[reference_oscar_sfc_closed_loop_finish_2026_06_15]]
(the bias report this program improves) + [[feedback_check_units_first]].
