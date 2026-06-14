---
name: oscar-quad-lane-comparator-2026-06-02
description: "SHIPPED: SpeedFeedTriVendorBatchComparatorEngine now 4-lane — Traditional/handbook added as AXIS D, ADDITIVELY (verdict taxonomy + 30 tests unchanged). quad_agreement = tri_agreement cells where the handbook lane also agrees. Completes the operator's PRISM-vs-HSMAdvisor-vs-GWizard-vs-traditional comparison; only FULL-SWEEP-RUN remains."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.244Z
aliases: reference_oscar_quad_lane_comparator_2026_06_02
---


Commit `62c18f77f3` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-QUAD-LANE-COMPARATOR (task #58). The structural completion of the operator's 4-lane comparison goal.

**What shipped:** `SpeedFeedTriVendorBatchComparatorEngine` gains the Traditional/handbook lane (`traditionalSpeedFeedLaneEngine`, #55) as AXIS D alongside PRISM / baseline / G-Wizard. Each cell now carries a `traditional: TraditionalCellMatch` (`{computed, vc_mpm, fz_mm, rpm, vc_var_pct_vs_prism, within_envelope, source}`), and the report gains `traditional_lane {computed, in_envelope, quad_agreement}` + `traditional_absolute_var_distribution`.

**The R7 design decision (surfaced, not blended):** I did NOT redesign the `CellVerdict` enum from tri→quad (that would have a 30-test blast radius + risk). Instead — ADDITIVE: keep the 6-verdict taxonomy + verdict logic byte-unchanged; report the handbook lane independently with its own delta-vs-PRISM; derive a `quad_agreement` report metric = tri_agreement cells where the handbook lane ALSO lands within ±25% of PRISM Vc. This mirrors how #54 added provenance additively. Result: the existing 30 comparator + 8 gwizard-honest tests stay green (38/38), and the 4-lane comparison is delivered. Lesson banked: when extending a classifier with a new dimension, prefer an additive reported axis + derived metric over an enum redesign when existing tests/consumers depend on the taxonomy — surface the choice, don't blend.

**Honesty (R12):** `quad_agreement` is a PROVABLE strict subset of both `tri_agreement` and `in_envelope` (AND-conjunction of their predicates — cannot over-count). tri_agreement already gates G-Wizard on `gwVotes` (real computation, #54), so quad counts only when 3 real lanes AND the conservative handbook lane all agree — strengthens the claim, never inflates it. Sign convention `(prism−trad)/trad×100` is byte-identical to the G-Wizard lane's, so the two deltas are directly comparable (no opposite-sign trap). The per-cell try/catch degrades a lane throw to `computed:false` (fail-soft for an advisory non-voting lane); total failure is detectable via `traditional_lane.computed===0` (the test asserts `>0`).

**Proof:** tsc 0; quad-lane test 9/9 PASS (material ordering N>P>S through the comparator, within_envelope consistency, counter manual-tally exactness, quad⊆tri, 6-key taxonomy intact); existing 38/38 PASS (additive, no regression). Per-file scrutiny 2/2 PASS, zero P0/P1. P2 deferred: capture the handbook-lane throw reason for partial-failure diagnosability (engine rule "never silentCatch" — mitigated since the lane is advisory + total failure is countable). P3: add a coupling comment to the two `ENVELOPE_PCT=25` consts.

**Last remaining unit for the full goal:** U-OSC9-FULL-SWEEP-RUN — run `jmFirstCohortEngine.build()` cells through this 4-lane comparator (reading the LAUNCHED HSMAdvisor + G-Wizard live libraries via `gwizard_state`), stream to `state/outcomes/exhaustive_sfc.jsonl`, emit an HTML/MD coverage+divergence report. Relates to [[reference_oscar_traditional_lane_2026_06_02]], [[reference_oscar_jm_first_cohort_2026_06_02]], [[reference_oscar_gwizard_lane_honest_2026_06_02]].
