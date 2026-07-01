---
name: oscar-gwizard-zero-sfm-honest-2026-06-03
description: "SHIPPED #60 U-OSC9-GWIZARD-ZERO-SFM-HONEST (commit 16e010cada): a G-Wizard toolcrib row with sfm/ipt<=0 (geometry-only, no cutting data) was finite -> pre-fix tagged 'gwizard_computed', so empty rows falsely VOTED divergent (Vc=0 vs PRISM) AND divided fz %-delta by 0 -> Infinity. isUsableRate(v)=finite&&v>0 gates lookupGWizard -> sfm<=0 -> 'absent'. Mirror of the false-tri bug #54 fixed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.690Z
aliases: reference_oscar_gwizard_zero_sfm_honest_2026_06_03
---


Commit `16e010cada` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-GWIZARD-ZERO-SFM-HONEST (task #60). **Surfaced by the #59 live JM sweep** ([[reference_oscar_full_sweep_run_2026_06_03]]) — the value of running real data.

**The defect (SpeedFeedTriVendorBatchComparatorEngine.lookupGWizard):** a G-Wizard toolcrib row with `sfm=0`/`ipt=0` (geometry-only — operator never entered cutting data for that tool) is *finite*, so the pre-fix `Number.isFinite(sfm)` checks kept it. Result: provenance tagged `gwizard_computed` (a LIE — G-Wizard computed nothing), so the empty row (a) inflated gwizard_computed coverage, (b) **falsely VOTED** in the verdict (Vc=0 vs PRISM 185 → `divergent`), and (c) divided the fz %-delta by `fzMm=0` → **Infinity**. This is the MIRROR of the false-`tri_agreement` bug [[reference_oscar_gwizard_lane_honest]] (#54) fixed — #54 stopped false agreement; sfm=0 produced false DISAGREEMENT.

**The fix (additive):** new module helper `isUsableRate(v): v is number = typeof v === "number" && Number.isFinite(v) && v > 0` gates the three `lookupGWizard` sites (candidate `hasSfm` filter, `useMfgSfm`/`useMfgIpt` gates, `sfm`/`iptIn` resolution). `sfm<=0` → null → provenance `"absent"` (lane abstains), per #54's own contract ("'absent' is a geometry match with no usable sfm"). Also closes the latent divide-by-zero on BOTH lanes (sfm and ipt).

**Proof (R9):** 48/48 comparator tests green — 30 main + 9 quad-lane + 9 gwizard-honest including a NEW regression case ("explicit sfm=0 row is 'absent'...") that asserts provenance="absent" + vc/fz/var all null (the `fz_var_pct_vs_prism===null` assert is the Infinity regression guard) + gwizard_computed tally 0. Fixture uses a non-matching description ("ZZZNOVENDOR") so the joiner-catalog can't backfill (reviewer-B confirmed the joiner gate fires only when vc_mpm===null). per-file scrutiny 2/2 PASS, zero P0/P1.

**Lesson:** "finite" is not "usable" — a 0/empty sentinel passes `Number.isFinite` but is not real data; provenance/voting gates must check `> 0`, not just finiteness. Honesty axes need positive-value gates, not just non-NaN. Relates to [[reference_oscar_gwizard_lane_honest]], [[reference_oscar_full_sweep_run_2026_06_03]].
