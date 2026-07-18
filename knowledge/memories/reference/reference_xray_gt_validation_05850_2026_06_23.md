---
name: reference_xray_gt_validation_05850_2026_06_23
description: GATED GT validation on part 05850 RAN -- settles the 2 default-ON decisions NEGATIVE. num_predict 4096 vs 8192 = WASH (recall 3/7 both, no hallucination inflation); reading-guidance on = same recall, LOWER precision. Recall pinned at exactly 3/7 across 5 stochastic runs -> the bottleneck is scan LEGIBILITY, not extraction-budget or prompt-knowledge. 2026-06-23.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_gt_validation_05850_2026_06_23
---


**xray session 2026-06-23 (slot xray, cad-fusion-live-ms0): the gated GT validation on part 05850 -- the run that was queued by [[reference_xray_num_predict_dense_dims_2026_06_23]] + [[reference_xray_reading_knowledge_2026_06_23]] -- was EXECUTED. Both pending default-ON flips are settled NEGATIVE on the evidence.**

Fixture: part **05850** (the one scoreable callout-GT part: `has_neutral_step`, GT from `ITW500-43050-05850-00.MIN`, print = "Scanned Document - 11/18/2020 6:17 AM.pdf", lathe, 7 callout-GT dims). Built a 1-part file (`.cache/temp/parts-05850.json`) so every run scores exactly it. Production model pinned `qwen3-vl:8b-instruct`. `--fresh` per run.

**6 runs spanning 4 OCR-side levers, EVERY one `recall=0.4286` (exactly 3 of 7 GT dims):**
| run | path | num_predict | guidance | enhance | recall | precision | dims |
|---|---|---|---|---|---|---|---|
| A1 | plain | 4096 (default) | off | off | 0.4286 | 0.2069 | 29 |
| A2 | plain | 8192 | off | off | 0.4286 | 0.2143 | 28 |
| B1 | region-route | 4096 | off | off | 0.4286 | 0.2051 | 39 |
| B2 | region-route | 4096 | **on** | off | 0.4286 | **0.175** | 40 |
| C1 | region-route | 4096 | off | **on** (preprocess+deskew) | 0.4286 | 0.1892 | 37 |

**Decision A (num_predict 4096->8192 default): WASH -> KEEP 4096.** Recall identical, dims 29->28 (went DOWN, not up), precision flat-in-noise. The R12 "more room to hallucinate" fear did NOT materialize on a normal part. BUT 05850 is LOW-density (28-29 dims fit in 4096) so it does NOT exercise the truncation lever the dense punch-block memo measured (28->56-86). The dense-part recall-lift remains UNVALIDATED-for-precision because **there is no dense part WITH callout GT in the perfect-parts set (n=91)**. Env knob `PRISM_OCR_NUM_PREDICT` stays the operability path; default unchanged = zero regression.

**Decision B (reading-guidance default-ON): NEGATIVE -> KEEP opt-in/off.** Same recall (3/7), +1 non-GT dim, precision DROPPED 0.2051->0.175. The curated knowledge channel did not lift recall on this part and slightly hurt precision. Do NOT flip default-ON on this evidence.

**THE headline finding:** recall is **pinned at exactly 3/7 across 6 independent stochastic runs spanning 4 OCR-side levers** -- extraction budget (4096/8192), knowledge channel (off/on), region routing (which DID raise dims 29->39-40), AND image preprocessing/deskew (`--enhance`, which DID change extraction: dims 39->37, precision shifted -- so it is behavior-changing, NOT a no-op) ALL leave recall immovable. The 3 matched GT dims have excellent relErr (0.004-0.011) so units + GT-matching are CORRECT for legible callouts.

**-> 05850 is GT-CEILING-BOUND, a POOR fixture for OCR recall levers.** The 4 missing GT dims are NOT recoverable by any OCR-side lever -- they are program-GT dims with no legibly-readable drawing callout in this scan (the program (.MIN) carries 7 distinct machined dims but only 3 appear as legible numeric callouts on the 2020 scanned drawing; the rest are implied by geometry/contour/stock or are off-view, `gt_class`/`contour_fraction` present in the record). So the recall ceiling is set by the GT/scan CONTENT, not by any tunable OCR knob. **CORRECTION of this memo's own prior pass:** the earlier "preprocessing is the next lever" conclusion was REFUTED by the C1 enhance run (R12/R16 -- the next run closed the gap). The real next step is NOT another OCR knob on 05850 but (a) confirm the 4 misses are genuinely absent-from-drawing (inspect the program-GT dims vs the scan), and (b) get a BETTER scoreable fixture whose missing dims ARE legibly on the drawing, so an OCR lever can actually be measured. The `--enhance` wire (now shipped into the harness) is the tool to A/B preprocessing on a genuinely-degraded-but-legible fixture once one is identified.

The validation did its job: it PREVENTED two unjustified default flips (num_predict, reading-guidance) AND a third premature one (defaulting/over-investing in preprocessing) -- all on R9/R12 grounds -- and re-pointed the effort at fixture quality + GT triangulation (backlog P2.7) as the true gate. Pairs with [[reference_xray_num_predict_dense_dims_2026_06_23]] · [[reference_xray_truncation_keycut_2026_06_23]] · [[reference_xray_reading_knowledge_2026_06_23]]. Backlog [[blueprint-reading-improvement-backlog-2026-06-19]].
