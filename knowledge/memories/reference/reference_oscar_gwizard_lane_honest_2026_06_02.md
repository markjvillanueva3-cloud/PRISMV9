---
name: oscar-gwizard-lane-honest-2026-06-02
description: "SHIPPED R12 soundness fix: SFC tri-vendor comparator no longer reports false tri_agreement against G-Wizard manufacturer-default values. Added GWizardCellMatch.provenance gate (gwVotes) + report honesty counters. From the SFC launch-readiness workflow assessment (G-Wizard is ~2.5-lane, not a real 4th calculator lane)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.241Z
aliases: reference_oscar_gwizard_lane_honest_2026_06_02
---


Commit `ab9e7b54e9` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-GWIZARD-LANE-HONEST (task #54).

**The defect (R12 fail-loud / unsound data):** `SpeedFeedTriVendorBatchComparatorEngine` classified any within-envelope G-Wizard match as a real third lane — its `tri_agreement` verdict fired on `gwizard.matched && gwizard.within_envelope` with NO provenance check. But G-Wizard has no public API; PRISM reads the operator's `toolcrib.csv`, whose sfm/ipt are OFTEN **manufacturer defaults** (`GWizardAdapterEngine` fields `useMfgSFM`/`mfgSFM`/`useMfgIPT`/`mfgIPT`, documented at line 84 as "MANUFACTURER values rather than G-Wizard computed"). So the comparator could report PRISM==baseline==G-Wizard three-way agreement against a value G-Wizard never computed. The "4-lane comparison" is structurally ~2.5 lanes (PRISM real + sparse cited baseline + inventory-shaped G-Wizard). Found by the SFC launch-readiness assessment workflow (`wf_3ba6d32a-13c`), confirmed by reading the adapter + comparator source.

**The fix (surgical, one engine):** `GWizardCellMatch` gains a required `provenance` ∈ `{gwizard_computed, mfg_default, joiner_catalog, absent}`, keyed off the Vc-driving sfm source (set at all 3 construction sites — emptyMatch=absent, lookupGWizard=computed/mfg/absent, joinerFallback=joiner_catalog). Verdict adds `gwVotes = matched && provenance==='gwizard_computed'`; the three **agreement/divergence** verdicts (`tri_agreement`, `divergent`, `dual_agreement`) now require `gwVotes` → a non-computed match can never manufacture a false agreement. `weak_disagreement` deliberately keeps `gwizard.matched` (it's a coverage/disagreement bucket, not an agreement claim — downgrading would erase a real geometry-match signal; both reviewers confirmed KEEP). Report gains `gwizard_provenance` tally + `false_tri_agreement_avoided` (honest over-claim count). `vendor_coverage` stays on `matched` (coverage ≠ vote — distinct, correct metrics).

**Proof (R9 load-bearing test):** drive one P/1018-steel cell computed-vs-mfg_default with IDENTICAL Vc/fz (only provenance differs) → the mfg cell satisfies every pre-fix tri precondition yet is NOT `tri_agreement` (old code would FAIL). 8/8 PASS; existing comparator 30/30 PASS (with 180s timeout — the 2 default-30s failures were fleet-load timeouts, not assertions, confirmed by isolated re-run); tsc 0; per-file scrutiny 2/2 PASS, zero P0/P1.

**Operator note:** HSMAdvisor + G-Wizard are LAUNCHED on this machine — their on-disk libs are live for the eventual JM-first full sweep, but this does NOT change the finding (PRISM reads files, not a live G-Wizard compute). Part of the SFC closed-loop comparison goal. Next critical-path units: U-OSC9-TRADITIONAL-LANE (#55, the missing 4th lane), U-OSC9-BASELINE-EXPAND, U-OSC9-JM-FIRST-SUBSET → U-OSC9-FULL-SWEEP-RUN. Relates to [[reference_sfc_speed_feed_bugs_2026_05_31]], [[reference_oscar_speedfeed_material_aware_shipped_2026_06_02]], [[reference_oscar_hsmadvisor_live_wire_2026_06_01]].
