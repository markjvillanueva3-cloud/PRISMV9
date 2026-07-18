# SFC-ACCURACY / MRR ↔ vc identity (mrr_inconsistent silent-wrong)

**Slot:** oscar · **Date:** 2026-07-02 · **Commit:** `[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-SFC-MRR-VC-IDENTITY`
**Tags:** sfc, product-engine, silent-wrong, mrr, combinatorial-sweep, oracle

## Finding
The exhaustive combinatorial sweep (`scripts/sfc-exhaustive-combinatorial-sweep.mjs`) over ~45M real `ProductEngine.productSFC` combinations reported **0 crashes / 0 defects / 0 out-of-band**, but its independent silent-wrong math oracle (`scripts/lib/sfc-sweep-oracle.mjs` `checkMrrConsistency`) flagged **11,360 cells at grid 36** where `mrr_cm3_min` was ~5-6% below `ap·ae·(fz·z·rpm)/1000` — only for low-MRR regimes (Ti-6Al-4V, D2, small diameter).

## Root cause
`calculateSpeedFeed` returns an integer-rounded `cutting_speed` next to a full-precision `spindle_speed`. At `ProductEngine.ts` the pair arrives inconsistent (`vc=7`, `rpm=766` ⟹ implied vc=7.219). `calculateMRR` re-derives `spindle_speed = 1000·vc/(π·D)` from the **rounded** vc → wrong feed_rate → wrong MRR. Coating/coolant derates recompute rpm from vc and masked it; the no-derate path exposed it. (Confirmed by instrumenting the call site, not by inference.)

## Fix
Anchor `vc` on the full-precision `rpm` immediately after reading the speed-feed result:
```ts
vc = (Math.PI * toolDiam * rpm) / 1000;
vf = fz * numTeeth * rpm;
```
All downstream consumers that re-derive rpm from vc (`calculateMRR`, Kienzle power `P=Fc·Vc`) then agree with the reported rpm/feed. vc display unchanged; power +<0.1% accuracy.

## Verification
- 2 flagged cells: relErr 5.9%/5.3% → **0.07%/0.41%**
- fresh 30k sweep: oracle **0**, 0 defects/suspects
- `ProductEngine.test.ts` **46 pass** (+6 regression: 2 exact flagged cells + 3 spanning guards + vc↔rpm identity)
- 109 SFC-path sibling tests pass; build:fast clean

## Lesson
A silent-wrong value (finite/positive/plausible but algebraically inconsistent with the page's own fields) is invisible to crash/NaN/range gates — only an independent oracle over the full input lattice catches it. When a producer emits a rounded display value beside a derived-from-raw value, anchor every consumer on one precision. Run the `sfc-overnight-driver` oracle sweep after any speed-feed/ProductEngine change.

Related: [[sfc-combo-u-sfc-parallel-sweep]] · memory `reference_oscar_sfc_mrr_vc_identity_fix_2026_07_02` · sibling web-accuracy bug `reference_oscar_sfc_page_dropped_inputs_2026_06_25`.
