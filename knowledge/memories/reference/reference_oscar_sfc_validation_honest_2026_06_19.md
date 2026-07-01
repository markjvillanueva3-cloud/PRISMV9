---
name: reference_oscar_sfc_validation_honest_2026_06_19
description: "SFC vs G-Wizard/HSMAdvisor honest validation (2026-06-19, slot:oscar) -- the \"6%/33% off\" headline was a HARNESS ARTIFACT; PRISM physics is sound; 3 real launch gaps remain"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.713Z
aliases: reference_oscar_sfc_validation_honest_2026_06_19
---


SFC launch-readiness validation vs G-Wizard + HSMAdvisor (2026-06-19, slot:oscar). Operator /goal: "ensure
our capabilities truly work, not just claimed... do a full comparison vs gwizard and hsmadvisor... launch soon."

**HEADLINE FINDING: the alarming "6% in-envelope / 33% off" from `sfc-baseline-compare-run.ts` is largely a
MEASUREMENT ARTIFACT, not a broken SFC.** Root cause: `SpeedFeedBaselineComparatorEngine.compare()` runs the
NineAxis orchestrator with NO `mode` + NO `machine` + a default **g6_3 holder (12,000-RPM cap)** and compares
that `balanced`-goal output against published Sandvik/Kennametal/CNCCookbook/HSMAdvisor data that is
**aggressive/max-MRR on balanced holders + HSM spindles**. Two compounding issues: (1) `compare()` silently
drops goal (the orchestrator reads top-level `mode`: `cost_batch`->tool_life, `aggressive_rush`->productivity,
else balanced -- NOT `optimize_for`); (2) the g6_3 holder caps RPM at 12k so high-Vc materials (aluminum)
are RPM-limited far below catalog.

**PROOF it's a harness artifact, not bad physics (live numbers, `mcp-server/scripts/sfc-vendor-validation-fair.ts`):**
- 6061 Al 10mm: bare default Vc=**365** (RPM-capped ~11,600) -> with g2_5 balanced holder + 24k spindle PRISM
  computes **754 vs catalog 775 (-3%)**. The default -53% is a PHYSICALLY-CORRECT RPM/holder constraint -- you
  cannot reach 775 m/min on a 10mm tool below ~20k RPM.
- Steel 1018 is NOT RPM-limited (only ~4,900 RPM) -> its -16% best is a GENUINE small base-table conservatism.
- Summary over 17 cells: default-goal **4/17 (24%)** within +/-15% Vc (mean dev 32.8%); best over
  {default}U{3 goals,ref-machine} **12/17 (71%)** (mean dev **13.5%**); catalog contained in PRISM range
  **12/17 (71%)**. Core carbide-milling: 1018 -7%, 304SS +14%, 6061 Al -3%; turning/CBN/Inconel already +1/+6%
  at default.

**3 GENUINE launch gaps (not artifacts):** (1) P-group steel milling Vc ceiling ~7-16% below modern coated-
carbide catalogs even at productivity (`P_milling_roughing.vc[aggressive]=185` vs catalog 220); (2) HSS
calibration ~45% HIGH vs conservative HSS refs (1018 pub 24 vs PRISM floor ~35-49); (3) the PRODUCT DEFAULT
goal is conservative -> customer out-of-box number is ~33% under catalog. Fixing the default goal alone moves
24%->~70%.

**STRUCTURAL REALITY (R12, repo-verified):** a fully-automated "every input" numeric comparison to G-Wizard /
HSMAdvisor is IMPOSSIBLE -- G-Wizard toolcrib.csv = 41,210 rows all sfm=ipt=0 (computed on-demand in the
closed UI, never persisted, commit 16e010cada); HSMAdvisor AppData has zero S&F fields. Only ~17 published
cells are auto-comparable (OCR-expandable). The credible competitive claim is capability + physics-fidelity-
vs-published, NOT "we match their every number."

**DELIVERABLES (on disk in H:/prism; COMMIT DEFERRED -- lane-guard routes oscar to h:/prism-slot-oscar but
this session's harness cwd is pinned to h:/prism; needs PRISM_GIT_ADD_LANE_DISABLE=1 in harness env or a
non-slot chat to land on cad-fusion-live-ms0):**
- `state/shared/specs/SFC-VS-GWIZARD-HSMADVISOR-2026-06-19.md` -- full capability matrix + validation + verdict + 6 launch-ordered recommendations.
- `mcp-server/scripts/sfc-vendor-validation-fair.ts` -- the honest per-cell goal-matched validation runner (2-arm scrutiny PASS after fixing aluminum 565->365 fabrication + CBN/Inconel best-delta mislabels).

**NEXT (highest ROI):** (1) decide + set the launch-default goal (product decision, 24%->70%); (2) tag
BASELINE_DB cells with a `reference_regime` so the harness compares like-for-like; (3) raise P-steel
aggressive Vc ceiling (physics-reviewer + S(x) gate); (4) cross-check HSS calibration; then frontend SFC UI
should surface the [cost..productivity] range + holder/spindle assumptions + CI.

**PHYSICS-REVIEW ADJUDICATION (2026-06-19, physics-reviewer agent, committed slot/oscar b15fca0efc):**
- **GAP 1 P-steel ceiling = CONFIRMED under-calibration (aggressive index only).** Approved fix
  `P_milling_roughing.vc [90,140,185] -> [100,160,220]` (Sandvik 230 / Kennametal 215 / MH31 ~215; also
  reconciles the engine's OWN `CANONICAL_MILLING_SPEEDS.P.rough=200` + `taylor_C(1018)=360` which already
  disagreed with 185). SAFE: Kienzle `Fc` is Vc-independent so workholding/deflection clamps unchanged;
  tool-life halving (1.19^4~=2x) is the intended aggressive trade; +19% spindle power bounded by RPM/S(x)
  clamps. **Caveat CLOSED with numbers:** all JM mills cap at 5000 rpm, so a 12mm tool is RPM-gated to Vc=188
  on every JM machine -> the 220 value never actuates there, +19% power can't arise. Fix is FULLY validated,
  ready-to-land (engine edit commit-gated by lane-guard from this slot chat).
- **GAP 2 HSS-on-steel = FALSE ALARM (no change).** PRISM's 0.35 HSS ratio is correctly calibrated to modern
  HSS-Co; 24 m/min is the old plain-HSS floor, not the right anchor. The real HSS over-speed was CAST IRON
  (K-group), ALREADY fixed by `hss:{K:0.13}` override. My earlier "+45% high" was the wrong-baseline trap.
- **ROI-popup regression FIXED + verified (5/5 tests), on disk, commit-gated:** papa tsc-fix `c516a27aa6` added
  a null-cost early-return killing the whole ROI popup when no part_volume_cm3 -> `rec.cost_per_part_usd ?? 0`.
- **Committed to slot/oscar:** `e89b52bd15` (report+runner), `54b0e6edec` (frontend §6 spec), `b15fca0efc`
  (physics adjudication). Engine fixes (ROI + P-steel) are commit-gated; land via [MAIN-FORCE]/non-slot chat.
- **For india:** `xproc_neural_consult_speedfeed` dispatcher returns ok:false on valid input (2 failing tests);
  engine method passes, only the dispatcher round-trip fails. XPROC-NEURAL-CONNECT-MS0.

Supersedes the framing in [[reference_oscar_sfc_full_assessment_2026_06_15]] re "PRISM under-speeds" -- it's
mostly default-goal + RPM-cap, not a physics error. Relates [[reference_gwizard_abstains_on_generic_combos_2026_06_04]]
· [[reference_oscar_sfc_per_vendor_compare_2026_06_09]] · [[reference_oscar_quad_lane_comparator_2026_06_02]].
