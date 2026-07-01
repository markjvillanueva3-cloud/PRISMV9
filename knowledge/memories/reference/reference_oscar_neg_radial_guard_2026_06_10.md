---
name: reference_oscar_neg_radial_guard_2026_06_10
description: "SHIPPED U-OSC-NEG-RADIAL-GUARD (32f1e6266a): UltimateSpeedFeedEngine accepted a NEGATIVE/NaN radial via a bare truthy check -> NaN forces -> safety clamps silently skipped. Now Number.isFinite && >0 gate + warn. P3 follow-ups listed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.692Z
aliases: reference_oscar_neg_radial_guard_2026_06_10
---


**SHIPPED 2026-06-10 slot:oscar, commit `32f1e6266a`, 3-of-3 PASS.** Surfaced as a P2 during the U-OSC-RADIAL-ENGAGEMENT review ([[reference_oscar_radial_engagement_fix_2026_06_10]]).

**Bug:** `UltimateSpeedFeedEngine` STEP-6 ae resolution (~line 2200) used a bare truthy check: `if (input.radial_depth_mm) {...} else if (input.radial_depth_pct) {...}`. A NEGATIVE value is truthy -> `ae_mm < 0` -> STEP-9 hex `acos(1 - 2*ae_mm/Dc)` gets an argument > 1 -> `NaN` Fc. A consumer's `Number.isFinite(fTan)` force-clamp guard then SILENTLY skips its safety derate -> no workholding/spindle protection on a DIRECT engine call (the 9-axis orchestrator's own `>0` gate shielded only the orchestrated path, not a direct `calculate()` caller).

**Fix:** `validRadialMm = Number.isFinite(input.radial_depth_mm) && input.radial_depth_mm > 0` (same for pct). Tiers resolve validMm -> validPct -> strategy override -> table; a *provided-but-non-physical* radial pushes a `warnings` entry (engine return+warn convention, never throw, never NaN-poison). Valid positive inputs resolve bit-identically (back-compat). `0` already fell through pre-fix (unchanged). Test: `ultimate-speed-feed-immersion-force.test.ts` +4 (neg mm / NaN mm / neg pct / back-compat positive), 9/9 green; assertions on finite-positive forces + positive fallback ae (field-independent of the warnings string).

**Lesson:** a bare `if (x)` truthy gate on a numeric physics input accepts negatives; when that input feeds an `acos`/`sqrt` domain, the result is NaN that downstream `Number.isFinite` safety guards then SKIP -- silent loss of protection. Validate numeric inputs with `Number.isFinite && >0` at the engine boundary.

**OPEN P3/P2 oscar follow-ups (in-lane, not yet built):**
1. `radial_depth` result provenance (~line 2790) keys confidence/source off `input.radial_depth_mm ?` truthiness -> a rejected negative still reports confidence 1.0 / "user_input" though the engine used the table fallback. Re-key off `validRadialMm`. (value is correct; only the label is optimistic.)
2. Dual-supply (valid mm + invalid pct) warning text says "falling back" though mm is correctly honored -- cosmetic.
3. U-OSC-SUBMM-IMMERSION: hex_mm `Math.max(1,Dc)` under-reports immersion for sub-1mm micro-tools at partial engagement (force-side; byte-identical to prior, pre-existing) -> `Math.max(1e-6,Dc)` + sub-mm regression test + physics-reviewer (chip-thinning regime).

Related: [[reference_oscar_radial_engagement_fix_2026_06_10]] · [[reference_oscar_sfc_nine_axis_contract]] · [[feedback_audit_consumers_when_moving_logic_into_engine]]
