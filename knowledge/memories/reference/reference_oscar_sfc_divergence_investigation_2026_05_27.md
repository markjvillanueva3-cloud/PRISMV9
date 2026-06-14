---
name: reference-oscar-sfc-divergence-investigation-2026-05-27
description: PRISM SFC vs vendor catalog divergence — N-aluminum 70% high + M/H/K turning-finishing 120-160% high. Root-cause analysis + remediation candidates.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.252Z
aliases: reference_oscar_sfc_divergence_investigation_2026_05_27
---


# SFC Divergence Investigation — 2026-05-27 (post catalog-joiner unlock)

## Smoke result (162 cells, post-joiner)

- `weak_disagreement`: 100 cells (Vc-var 25–40%)
- `divergent`: 50 cells (Vc-var >40%) — **spread across all 6 ISO groups**: P:4, M:8, K:9, N:12, S:8, H:9
- `gwizard_|var|%` p50 = **53.8%** (PRISM consistently ~54% off the OEM joined-catalog median)
- 0 `tri_agreement` cells across all 162

## Where the 70%+ divergence comes from (PRISM higher than baseline)

PRISM's Vc derivation chain (`UltimateSpeedFeedEngine` → `SpeedFeedNineAxisOrchestratorEngine`):

```
Vc_base = CANONICAL_TAYLOR[iso].C / T^n          // Taylor base for T=20 min default
Vc_recommended = Vc_base
                × controller_smoothing_factor    // 1.00–1.30 (HSM/AICC/look-ahead)
                × coolant_effectiveness          // 0.60 (dry) → 1.40 (cryo)
                × toolpath_engagement_factor     // 1.00 (conventional) → 0.45 (adaptive — INVERSE)
                × machine_rigidity_factor        // 0.85 (economy) → 1.10 (premium)
                × coating_bonus                  // ~1.0–1.5 for TiAlN/AlCrN
                × mode_multiplier                // prism_optimized aggressive
```

For N-aluminum 6061 carbide endmill 6mm, T=20 min:
- `CANONICAL_TAYLOR.N = { C: 600, n: 0.40 }` (PRISM physics constant, ISO 3685)
- `Vc_base = 600 / 20^0.40 = 181 m/min`
- With default 9-axis defaults (~1.15× cumulative multipliers): **Vc_PRISM ≈ 208 m/min**
- Sandvik 6061-T6 published: **200–400 m/min** (carbide, 6mm endmill)
- Curated baseline DB median (PRISM's `SpeedFeedBaselineComparatorEngine`): **~120 m/min**

**So PRISM is HIGHER than the curated baseline DB but WITHIN the Sandvik published range.** The 70.8% baseline_var = (208-120)/120 reflects the baseline DB being calibrated more conservatively than Sandvik's own published numbers.

## Where the 120-160% divergence on hard-group turning comes from

Top 5 divergent cells, all carbide turning finishing on 6mm:
- M (304 stainless) turning finishing — gwizard_var **161%**
- H (H13 hardened) turning finishing — **148%**
- K (cast iron class 40) turning finishing — **138%**
- M (304 stainless) turning roughing — **123%**
- K (cast iron) milling finishing — **111%**

These are exactly the cells where:
- Joiner returns Sumitomo/Seco/Kennametal **manufacturer-recommended** Vc (conservative — manufacturer-recommended values include broad safety margins for fleet variability)
- PRISM's 9-axis orchestrator stacks multipliers (rigidity × controller × coolant × mode=aggressive) on top of the Taylor base

For 6mm diameter on a HARD MATERIAL, the manufacturer ALREADY assumes a conservative setup. PRISM's stacking of premium-rigidity + AICC-smoothing + adaptive engagement on top is **double-counting** — PRISM thinks the operator is using a premium machine when the manufacturer table already assumed a typical machine.

## Failure-mode hypotheses — CORRECTED 2026-05-27 (afternoon)

**Original hypothesis ("default 9-axis multipliers stack too aggressively") was WRONG.**
Code review (`SpeedFeedNineAxisOrchestratorEngine.deriveAxisFactors`, line 604) shows
the axis defaults ARE 1.0 when caller doesn't supply an axis:
- `machine` undefined → way_type=hybrid_way (1.00) × build_quality=production (1.00) = 1.00
- `controller` undefined → all flags false → starts at 1.0, no multipliers fire
- `coolant` undefined → flood (1.00)
- `toolpath.strategy="conventional"` → 1.00
The "premium/HSM/adaptive" defaults claim is FALSE.

**Original hypothesis ("prism_optimized pushes past Pareto knee") was ALSO WRONG.**
Code review (`buildModeRecommendation`, line 793) shows `prism_optimized` mode reads
`sfc.alternatives.balanced.vc` DIRECTLY from UltimateSpeedFeedEngine — that IS the
Pareto-knee value. The 9-axis multipliers apply only to MRR, never to Vc.

**ACTUAL root cause is one layer deeper — inside `UltimateSpeedFeedEngine`.**
The divergence is `UltimateSpeedFeedEngine.calculate().alternatives.balanced.vc`
being calibrated ~70% above the curated baseline DB median Vc. This requires
auditing UltimateSpeedFeedEngine's balanced-alternative Vc selection, not the
9-axis multiplier layer.

Two possible root causes inside UltimateSpeedFeedEngine:
  a) PRISM's Pareto-knee selection picks closer to the V_max_prod end of the
     curve (e.g., upper-quartile of vc_min..vc_max range) while baseline DB
     sits closer to V_balanced (50th percentile)
  b) PRISM's Taylor-equation reference T (tool life budget) is lower than the
     baseline DB assumed (e.g., PRISM T=10 min → high Vc; baseline T=30 min → low Vc)

To verify: extract a single-cell trace through UltimateSpeedFeedEngine for
(N-aluminum, 6mm carbide endmill, milling-roughing) and compare:
- The `alternatives.{conservative, balanced, aggressive}.vc` values
- The Taylor T budget used
- The baseline DB's median (already known from smoke: ~120 m/min)
- Sandvik's published range for the same cell (200-400 m/min)

If PRISM's `balanced.vc` lands close to Sandvik upper-quartile (~325 m/min) and
baseline DB sits at lower-quartile (~120 m/min), the apparent 70% divergence is
just baseline-DB-conservatism vs published-range-midpoint difference — NOT a
PRISM bug.

## Revised fix candidates (post code review 2026-05-27 afternoon)

| # | Fix | Effort | Impact |
|---|---|---|---|
| **A** | **Single-cell trace audit** of `UltimateSpeedFeedEngine.calculate().alternatives` for the worst divergent cell (N-aluminum 6mm carbide milling roughing). Capture {conservative, balanced, aggressive} Vc + Taylor T budget; compare against Sandvik published range + baseline DB median. Find whether the 70% gap is calibration drift OR baseline-DB-conservatism. | 1 session | Determines whether ANY code fix is warranted |
| **B** | If Audit A shows PRISM `balanced.vc` is upper-quartile of published range: **adjust the balanced-alt selection** to pick true 50th-percentile instead of ~75th-percentile. Engine work, not orchestrator work. | 1 session after A | Closes most of the 53.8% gap iff (a) is the cause |
| **C** | If Audit A shows the Taylor T budget is too low: **make T configurable per-mode** (cost_batch=60min, balanced=30min, aggressive=10min) instead of one constant. | 1-2 sessions after A | Closes the gap via T-knob; clean physics rationale |
| **D** | If Audit A shows neither — divergence is just baseline-DB-conservatism: **document it as expected** (PRISM intentionally above baseline because it accounts for modern coatings/coolant the baseline DB doesn't), and move the test bar from "must agree with baseline" to "must agree with published OEM range". | 0.5 session | Reframes the success criterion honestly |

**Original Fix #1 / Fix #2 / Fix #3 are SUPERSEDED — they targeted the wrong layer.** The 9-axis orchestrator multiplier stacking is fine; the divergence lives inside UltimateSpeedFeedEngine's balanced-alternative selection.

## What this is NOT

- **NOT a Kienzle constant bug.** Kienzle is for cutting FORCE (Fc = kc1.1 × ap × fz^(1-mc)), not directly for Vc. Vc derivation is the Taylor side.
- **NOT a Taylor constant bug.** CANONICAL_TAYLOR matches ISO 3685:1993 published values.
- **NOT a unit conversion bug.** Vc is reported in m/min consistently; the joiner converts to/from ft/min only at the G-Wizard boundary.

## Cross-references

- Smoke ledger: `H:/prism-slot-oscar/state/outcomes/sf-tri-vendor-smoke.jsonl` (162-cell post-joiner, `gwizard_var_pct_vs_prism` field per cell)
- Engine to audit: `mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` (the multiplier stacking lives in `deriveAxisFactors()`)
- Companion engine: `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` (Taylor base calculation)
- Joiner: `mcp-server/src/engines/SpeedFeedCatalogJoinerEngine.ts` (gives the manufacturer-recommended baseline this investigation compared against)
- Sister memory: [[reference_oscar_sfc_9axis_u_osc9_14_2026_05_26]] (pre-joiner state showing N-aluminum was the ONLY visible divergent cluster)
