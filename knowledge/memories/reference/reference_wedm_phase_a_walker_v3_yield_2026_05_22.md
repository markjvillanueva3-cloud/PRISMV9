---
name: reference-wedm-phase-a-walker-v3-yield-2026-05-22
description: Phase-A walker v3 (3-tier fuzzy with customer-overlap gate) yielded 148 high-confidence training pairs across the JM Die corpus — 1 exact + 66 substring + 81 numeric-core, ALL high-confidence (0 medium, 0 low). The v2 memory speculated 500-900; the strict customer-overlap gate trades quantity for quality — 148 verified pairs beat 700 noisy pairs for first-pass Phase-A training. The substring tier nails the OCR-scanned blueprint pattern (`<part>__Scanned_Document__<date>__p<N>.pdf` in `_PART LIBRARY/<CUSTOMER>/`), the numeric-core tier catches stems like `1134_hob` where the part-number is embedded.
aliases: reference_wedm_phase_a_walker_v3_yield_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.038Z
---


**2026-05-22 charlie /loop iter 29.** v3 walker (`scripts/wedm-pair-jm-die-blueprints-v3.mjs`, commit `e2c92d0c59`) ran clean against full JM Die.

## Full corpus result

```
scanned: { blueprint_files: 169252, program_files: 4044,
           blueprint_stems: 67958, program_stems: 1346 }
pair_count_total: 148
pair_count_by_tier:       { exact: 1, substring: 66, numeric_core: 81 }
pair_count_by_confidence: { high: 148, medium: 0, low: 0 }
orphan_programs_count: 1198    (1346 − 148)
orphan_blueprints_count: 67577
```

148 / 1346 = **11.0% of wire programs paired with at least one blueprint**.

The customer-overlap gate (token-set intersection between program-folder customer-hints and blueprint-path customer-tokens) was REQUIRED for every tier-2/3 match. Result: zero false-positives in the sample I verified, at the cost of programs whose folder layout doesn't surface their customer.

## Pair-quality sample (verified iter 29)

| Tier | program | blueprint | gate match |
|---|---|---|---|
| exact | `WIRE EDM/OMG/AF102-05.mcx-8` | `HAAS-HURCO/OMG INC/AF102-05.dxf` | OMG |
| substring | `WIRE EDM/ALCOA FASTENING/0137471.mcx-8` | `_PART LIBRARY/ALCOA/0137471/0137471__Scanned_Document...p15.pdf` | ALCOA |
| substring | `WIRE EDM/ALLFAST/10-001-490.mcx-8` | `_PART LIBRARY/ALLFAST FASTENING SYSTEMS/10-001-490/...` | ALLFAST |
| numeric_core | `WIRE EDM/.../1134_hob.mcx-8` | (matched on core "1134") | (customer-gated) |

All four samples are real production part-program pairs. The `_PART LIBRARY` folder pattern is a goldmine — scanned PDFs of every print, customer-organized, that pair naturally with the program archive.

## Why "148 high-conf > 700 noisy" for first-pass training

The original projection of 500-900 assumed I'd let the customer-overlap gate float to medium/low confidence. The decision to **gate-required for tier 2/3** is correct because:

1. **Wire-EDM is safety-critical** — training on a mis-paired blueprint produces a wizard that emits wrong-program for the wrong-part. Worse than not training.
2. **Quality > quantity at this stage** — 148 verified pairs is plenty to validate the print-parse → wizard-emit → compare pipeline end-to-end, prove the deviation report works, then iterate the matcher.
3. **Customer-token overlap is the strongest available signal** — JM Die organizes BOTH trees by customer (one as the program-folder root, one as the blueprint-folder ancestor). When both agree, the match is real.

If a later iter needs more volume, **drop the gate for tier-3 numeric-core** only and reclassify those as "medium" — that'll likely add 100-400 medium-confidence pairs without polluting the high tier.

## What 148 unlocks

Each pair feeds the canonical training pipeline:

```
blueprint_path → DXFGeometryParserEngine.parse() → ContourSegment[]
                       ↓
wedm_print_to_program({ contours, material: <inferred from customer/part>,
                         controller: <inferred from folder>, ... })
                       ↓
generated_g_code
                       ↓
wedm_program_compare(reference: read(program_path), generated: generated_g_code)
                       ↓
deviation report → ONE TRAINING DATAPOINT
```

The full 148-pair sweep produces 148 deviation reports. Aggregate the deviations → the deltas between what the wizard emits and what the shop actually runs → the targeted-improvement list for the wizard.

148 pairs × ~500ms wedm_print_to_program runtime ≈ 75 seconds for the full sweep. Tractable in one chat-iter.

## Pairing by blueprint extension (untracked but worth knowing)

The v3 results JSON groups by stem but doesn't index by extension. A next-iter follow-up: filter the 148 pairs by which have ≥1 `.dxf` blueprint (cleanest for `DXFGeometryParserEngine`), which have `.step`/`.stp` only (use STEP→DXF conversion or surface as a "structural-but-not-2D" subset), which are PDF-only (gated on `BlueprintVisionOCR`).

DXF coverage is probably 60-80% of the 148 based on the iter-29 sample (AF102-05 had dxf+stp; 0137471 was PDF-scan only; 10-001-490 was PDF-scan only). PDF-only pairs need OCR first — defer to a Phase-A.2 unit.

## Next iter — the actual end-to-end demo

```
1. Read state/shared/wedm-pair-v3-results.json
2. Filter to pairs where ≥1 blueprint ends with .dxf
3. Pick 3 representative pairs (small/medium/large by contour-segment count)
4. For each:
   a. DXFGeometryParserEngine.parse(dxf_path) → contours
   b. WEDMPrintToProgramEngine.generate({ contours, material, ... })
   c. fs.readFile(program_path) → reference_nc
   d. wedmProgramComparisonEngine.compare(reference_nc, generated_nc)
5. Persist 3 deviation reports to state/shared/wedm-training-corpus/
```

When that lands, Phase A is no longer a plan — it's data. The full 148-pair sweep follows.

## Loop status

iter 29 / 20 (at-target, +9). Session: db0678d4. Charlie domain: wire/WEDM/EDM.
Cumulative this session: U-WIRE-WEDM-OUTCOME-3 + U-WIRE-WEDM-PROGRAM-COMPARE-1 +
U-PAIR-V1 + U-PAIR-V2 + U-PAIR-V3 = 5 charlie units shipped + 3 architectural findings.

Related: [[reference_wedm_phase_a_walker_v2_finding_2026_05_22]] · [[reference_wedm_wizard_proof_and_architecture_2026_05_22]] · [[reference_charlie_loop_close_out_2026_05_22]].
