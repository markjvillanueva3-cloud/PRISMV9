---
name: reference_oscar_sfc_wiring_tier1_2026_06_19
description: "SFC-WIRING-MS0 Tier-1 ground-truth re-verify + first ship (slot:oscar 2026-06-19). gap#4 chip-thinning is a SAFETY TRAP (hmax vs avg-chip); CWEZBuffer/EffectiveDiameterCompensator do not exist; shipped deflection->canonical (0aa5e7e717)."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.716Z
aliases: reference_oscar_sfc_wiring_tier1_2026_06_19
---


SFC-WIRING-MS0 Tier-1 re-verification + first unit (slot:oscar, 2026-06-19). Resumed the SFC-WIRING-MS0
loop (wire ~96 unwired-but-applicable engines into the SFC calc path). Per the audit's own roadmap step 1
("re-run the ground-truth map before wiring -- the original was 429-rate-limited"), ground-truth-verified
the 3 Tier-1 targets against the live orchestrators BEFORE editing. Findings:

**GROUND TRUTH (verified by grep over the 3 orchestrators):**
- `UltimateSpeedFeedEngine.ts` has **ZERO** references to ANY specialist engine (InstantaneousEngagement /
  ChipThinningCompensation / deflection / HeatTreatmentAware / SFCFewShot). gaps #1/#4/#5 are GENUINELY
  unwired -- the orchestrator re-implements all of it inline. (Confirms audit, de-flags no false positives.)
- gap #10 (closed-loop sink): `SpeedFeedOrchestratorEngine` imports `CrossProcessOutcomeStore` as
  `import type` only (L39) + names `SFCOutcomeCaptureWireEngine` in a COMMENT only (L3509) -- type/comment,
  never called. BUT `UltimateSpeedFeedEngine` DOES `import { captureSFC } from middleware/sfcOutcomeWire.js`
  (L32) -- so the sink is partially wired in Ultimate; re-audit before claiming gap #10 fully open.

**MISSING audit-named engines (do NOT plan against them):**
- `CWEZBuffer` -- DOES NOT EXIST. gap #1's wire target is just `InstantaneousEngagementEngine`.
- `EffectiveDiameterCompensator` -- DOES NOT EXIST. gap #8 is INFEASIBLE as written; use `BallEndMillEngine`
  Deff if pursued (Tier-2).

**gap #4 chip-thinning is a SAFETY TRAP (the key finding -- do NOT naive-swap):** there are THREE different
chip-thickness formulas computing DIFFERENT physical quantities:
- `ChipThinningCompensationEngine.calculate()` (L110): `hex = fz*sqrt(ae/D)`, comp factor `sqrt(D/ae)` cap 2x
  = **AVERAGE** chip thickness for **FEED compensation**.
- inline STEP-9 (L2337, the 2026-06-10 fix): `hex = fz*sin(acos(1-2*immersionRatio))` = **MAX** chip
  thickness (hmax) feeding the **Kienzle peak force** `Fc = Kc*ap*hmax`.
- inline `millingMaxChipThickness` (L1020) = a THIRD form, and it is **DEAD CODE** (defined, never called).
The audit said "replace inline chip-thinning with the canonical singleton" -- doing that naively would put
the AVERAGE-based `sqrt(ae/D)` into the PEAK-force path -> wrong Fc -> unsafe power/workholding clamps.
**RESOLUTION (physics-reviewer ruled -- gap #4 is a FALSE GAP, NOT a wiring; commit U-SFC-DEAD-CHIPTHIN-RM):**
the SFC ALREADY has BOTH correctly + separately -- hmax inline at STEP-9 (force, `~L2336`) AND a chip-thinning
FEED compensation (CTF) via `chipThinningFactor()` applied at STEP-7 (`fz_programmed = fz * ctf`, surfaced as
`chip_thinning_factor`). So there is NOTHING to wire: a swap into the force path is unsafe (~37% Fc under-report
at 10% radial), and wiring the singleton as a feed axis would DOUBLE-COUNT the existing CTF. Reference pattern:
`MachiningIntelligenceOrchestratorEngine` already uses the canonical engine as a feed-comp axis ONLY, separate
from its independently-computed Fc. Actionable residue ONLY: deleted the dead `millingMaxChipThickness` (was a
redundant 3rd hmax form inviting the unsafe swap) -> replaced with a do-not-reintroduce NOTE. NOTE:
`InstantaneousEngagementEngine` (gap #1) uses the SAME hmax form as STEP-9 (`sin(arccos(1-2r))`), so gap #1
is a behavior-preserving refactor + per-block toolpath capability (only valuable WITH toolpath geometry the
headline single-point SFC lacks -> guarded-fallback enhancement, lower urgency).

**SHIPPED U-SFC-DEFLECTION-CANONICAL (commit 0aa5e7e717, the safe correctness slice of gap #5):**
STEP-11's tool-deflection estimate used an INLINE `E=600000` (carbide-only) + inline `F*L^3/3EI`. An
EXPLICIT HSS/ceramic tool was treated as carbide-stiff -> deflection UNDER-predicted on softer substrates.
Now routes through canonical `constants.ts` `toolDeflection(F,L,D,E)` with
`E = getToolModulus(input.tool_material ?? "carbide")`: byte-identical for carbide, material-correct (larger,
SAFE direction) for explicit softer substrates, inferred/absent -> carbide baseline (zero surprise; avoids
the inferred-ISO-H CBN stiffer-modulus that physics-reviewer flagged as ~12% un-conservative). Deflection is
REPORT-ONLY (`result.forces.deflection_um`) -- NO feed/power/workholding clamp impact (physics-reviewer
confirmed). 9 reference-value tests (`ultimate-speed-feed-deflection-canonical.test.ts`) + main 401-assert
gauntlet green; 2-arm scrutiny PASS (physics-reviewer + reviewer).

**Commit-path (confirmed working):** slot oscar commits engine edits as `[MAIN-FORCE]` directly on
`cad-fusion-live-ms0` from the shared `H:/prism` tree (NOT the slot/oscar worktree, whose merge corrupts
engine files -- the dropped bc58639912). This is the path oscar's 6 commits on 6/19 used.

**Pre-existing test fails (NOT regressions, untouched by this work):** gauntlet-r2 cryo+Inconel thermal;
gauntlet-r2 `spindle_rpm.unit` engine="rev/min" vs test-expects "RPM" (unit-string staleness);
`ultimate-speed-feed.test.ts` getMaterialProfile S-group kc1_1 engine=2800 (canonical) vs test=3000 (stale).
Candidate trivial auto-fixes (separate units): align the 2 stale test expectations to the canonical/actual
engine values.

**NEXT-UNIT gap #2 (HeatTreatmentAware) -- characterized, NOT yet built (double-count caveat):** REAL gap
(the SFC has NO heat-treat-regime awareness) BUT wiring needs care. `HeatTreatmentAwareSpeedFeedEngine.adjust()`
is REGIME-driven -- needs an explicit `heat_treat_regime` enum (annealed/normalized/quenched_tempered/
through_hardened/precip_hardened/nitrided/case_hardened -> modifier 0.30-1.00 on SFM+chip-load+tool-life),
which the SFC input does NOT currently have (only `hardness_hb`/`hardness_hrc`). The SFC ALREADY derates Vc by
hardness: `hFactor = hardnessSpeedFactor(hardness_hb, mat.hardness_hb_typical)` (UltimateSpeedFeedEngine ~L2168/
2172) + the `effectiveIso` H-switch (hardness>400 -> ISO-H). So applying the regime modifier ON TOP would
DOUBLE-COUNT the Vc derate. Correct wiring is a physics-design call (R7, physics-reviewer REQUIRED): likely
either (A) regime REPLACES hardnessSpeedFactor when a regime is given, or (C) regime INFORMS the hardness
expectation feeding the existing factor (unify, don't stack). Build steps: add `heat_treat_regime` input ->
reconcile with hFactor (no double-count) -> physics-reviewer -> reference-value tests (regime modifiers +
no-double-count invariant) -> LIVE validation (Vc on Q&T die-steel vs published). Force/Vc-path = alters live
recommendations (shop-floor S(x)>=0.98) -- do NOT rush.

Relates [[reference_oscar_sfc_wiring_audit_2026_06_19]] (the source audit) ·
[[reference_oscar_radial_engagement_fix_2026_06_10]] (the STEP-9 hmax 2026-06-10 fix this builds on).
