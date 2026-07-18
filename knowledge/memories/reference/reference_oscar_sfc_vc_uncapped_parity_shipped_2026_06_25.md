---
name: reference_oscar_sfc_vc_uncapped_parity_shipped_2026_06_25
description: "SHIPPED U-OSC-VC-UNCAPPED-PARITY (slot:oscar, 2026-06-25, commit 56648c0fd1): additive cutting_speed_uncapped + rpm_capped fields expose the pre-RPM-cap surface speed so SFC vendor parity is apples-to-apples. Closes the false 'aluminum 3.5x under-prediction' (it was an RPM-cap-vs-uncapped-vendor artifact). 2-of-2 scrutiny PASS, 573 SFC tests green, live report validated. Discovered follow-up: Task #14 rigidity-rides-over-cap."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.713Z
aliases: reference_oscar_sfc_vc_uncapped_parity_shipped_2026_06_25
---


**SHIPPED U-OSC-VC-UNCAPPED-PARITY (slot:oscar, 2026-06-25, commit `56648c0fd1`).** The R15 build that
resolves the (corrected) Task #13. Follows the R12 finding
[[reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25]] that the "aluminum ISO-N 3.5x Vc
under-prediction" was NOT a physics bug but an RPM-cap-vs-uncapped-vendor comparison artifact.

**What shipped (additive only -- no existing number changes):**
- `UltimateSpeedFeedEngine.ts`: capture the pre-cap Vc -> new optional result fields
  `cutting_speed_uncapped` (OptimizedValue) + `rpm_capped` (boolean). `vcUncapped` is snapshotted right
  before the `maxRPM` cap block; `rpm_capped` is true only when the cap actually reduced Vc.
- `SpeedFeedTriComparatorEngine.ts`: surface `vc_uncapped_mpm` + `rpm_capped` on the PRISM `SystemOpinion`
  (safe `?.value ?? rec.cutting_speed_mpm` fallback) + a warning when capped ("compare vc_uncapped_mpm for
  apples-to-apples parity").
- `scripts/sfc-closed-loop-compare.mjs`: the report now prints `PRISM 226.0 (RPM-capped from 460.0 uncapped)`.
- `src/__tests__/sfc-vc-uncapped-parity.test.ts`: 4 reference-value/algebraic-invariant tests
  (cap_Vc = pi*D*maxRPM/1000; strict uncapped>capped when capped; byte-equal when not; alias-detecting).

**Validation (R15):**
- Live report (`sfc-closed-loop-compare.mjs --no-vendor`): N/6061/6mm finishing now reads
  `PRISM 226.0 (RPM-capped from 460.0 uncapped) | baseline 775.0` -- the false "3.4x bug" is now an
  explained machine constraint (460 uncapped vs 775 vendor is a defensible balanced-vs-aggressive modeling
  gap within the N table's 305-915 range).
- 573 SFC tests green (4 new + 569 existing incl. the 325-case gauntlets + 106 variability + 64 orchestrator
  + 10 tri-comparator). Type-clean (tsc on changed files). Zero regressions (additive).
- Per-file scrutiny: physics-reviewer PASS (capture point correct, reporting-only, invariant holds, no
  inlined constants, G6.3 cap not softened) + reviewer PASS (fallback safe, fields PRISM-only/optional,
  tests alias-detecting, ASCII-clean). 2-of-2, no P0/P1.

**UPDATE 2 -- parity completed at the VERDICT level (commit `d405d1bb19`, U-OSC-PARITY-VERDICT-UNCAPPED):**
`prism_vs_consensus` + `pairwise` (which feed calibration) now compare PRISM's UNCAPPED recommendation
against the uncapped vendor consensus -- a `prismParityAxes` is built at the call site (scale vc/rpm/feed by
the un-cap ratio, fz unchanged) ONLY when `rpm_capped`, so a cap artifact (226 vs 775 = -71%) no longer
injects a false gap that calibration would chase; the real modeling gap (460 vs 775 = -41%) is what's
learned. `axes.vc_mpm` (capped) stays the operator value. Uncapped cells byte-identical (10 comparator tests
unchanged). 2 R9 tests; reviewer PASS. **The Vc-cap parity theme is now COMPLETE end-to-end: correct->expose
->safety->verdict.**

**UPDATE -- Task #14 SHIPPED (commit `511b9f89be`, U-OSC-RIGIDITY-CAP-REAPPLY):** the rigidity
follow-up below was fixed same session. The engine now re-applies the machine max-RPM cap AFTER rigidity
scaling (spindle_rpm <= machine_max_rpm holds for every rigidity tier) and scales `cutting_speed_uncapped`
by the rigidity factor. 3 new R9 tests (safety invariant; ~13197->12000 without/with fix) + 569 existing
green; physics-reviewer PASS (all 6 verifications, no P0/P1); gauntlet byte-identical (rigidity=1.0 guard).

**Original discovered follow-up (Task #14, pre-existing):** physics-reviewer flagged that
`UltimateSpeedFeedEngine.ts` (~line 2830) applies `Vc *= rigidityFactor` AFTER the RPM cap and recomputes
rpm WITHOUT re-applying the cap -> `machine_rigidity='high'` (1.1) pushes rpm to maxRPM*1.1 (12000->13200),
back above the just-enforced cap (safety-relevant: could command spindle > max RPM). Not reachable by the
parity path (default medium rigidity=1.0). Fix = re-apply cap after rigidity scaling OR document the
ride-over; physics-review mandatory. Also makes `cutting_speed_uncapped` mean "before BOTH cap and rigidity"
in the rigidity!=1.0 case (label nuance to document with the fix).

Sibling: [[reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25]] (the finding) ·
[[reference_oscar_sfc_vendor_parity_run_2026_06_25]] (original run, N-cell root-cause superseded) ·
wiki [[capped-achievable-vc-vs-uncapped-vendor-surface-speed-is-not-a-physics-bug]].
