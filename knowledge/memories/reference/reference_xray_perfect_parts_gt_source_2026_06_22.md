---
name: reference_xray_perfect_parts_gt_source_2026_06_22
description: "Perfect-parts closed-loop GT source breakdown -- 57% are .mcx-8 (no posted G-code), so the next coverage lever is CAD-model GT, NOT program selection"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_perfect_parts_gt_source_2026_06_22
---


**xray closed-loop GT-source analysis (2026-06-22, slot:xray) -- a REFUTED lever + the real next one.**

`state/shared/ocr-training-loop/perfect-print-cad-program-parts.json` has **91 perfect parts** (print + CAD + program). The `validate-perfect-parts.mjs` runner scores OCR vs the PROGRAM ground truth, but the `sample_nc` extension breakdown is:
- `.min` 37 + `.hnc` 2 = **39 posted G-code** (scoreable: lathe via `extractProgramGT`, mill via the new `extractMillProgramGT`).
- `.mcx-8` **52** (57%) = Mastercam binary CAM source, skipped as `program-not-nc` (correctly -- reading the binary as text scrapes garbage coords).

**REFUTED lever (do NOT build):** "make `find-perfect-parts` PREFER a posted `.NC`/`.MIN` over a `.mcx-8` when selecting `sample_nc`." Premise checked against the join (`H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl`): of 8 sampled `.mcx-8` parts (B0762-87-01, 110206, 1571175, PFT-30262A-31, A225051-002HK, 9100956, T2358-621-2D2, 113063), **0 have a posted-NC sibling in `programs[]`** -- they have ONLY the `.mcx-8` (mcx=1..3, posted=0). The shop kept only the Mastercam file. So preferring posted unlocks nothing; the skip is correct. (R15 premise-validation saved building a useless feature.)

**CAD-model GT is ALSO low-payoff (checked, R12):** of the 91 parts only **11 have a neutral STEP** CAD; of the 52 `.mcx-8` parts only **6** do. `sample_cad` distribution: **68 `.ipt`** (Inventor binary), **12 `.x_b` + 3 `.x_t`** (Parasolid binary) -- ALL unreadable natively (the standing no-native-reader gap) -- vs just **4 `.stp`/`.step`**. So CAD-GT (STEP CYLINDRICAL_SURFACE radii -> hole/bore Ã) would unlock at most ~6 parts. NOT the high-value lever first assumed; a `U-XRAY-CAD-MODEL-GT` unit is small-payoff and overlaps delta -- DEPRIORITIZED.

**Bottom line for the closed-loop measurement corpus:** it is fundamentally GT-limited to ~39 posted-program parts (`.min`/`.hnc`, now BOTH lathe AND mill after `U-XRAY-MILL-PROGRAM-GT`) + ~6 STEP-CAD parts. The other ~46 (`.mcx-8` program + `.ipt`/`.x_b` CAD) need a Mastercam/Inventor SDK or a posting step (out of scope, no native reader). **The mill-program GT just shipped was the correct highest-ROI lever** -- it unlocked the mill subset of the 39 posted parts (mill `.NC`/`.MIN`: ALL STAR, TAPTITE, etc.), the only non-GPU expansion with real payoff. The next genuine step is a GPU validation run of the broadened `validate-perfect-parts` to MEASURE the mill recall lift (operator nightly / quiet-fleet window), not more GT-source work.

Pairs with [[reference_xray_mill_program_gt_2026_06_22]] (the program-side mill GT just shipped) and the backlog [[blueprint-reading-improvement-backlog-2026-06-19]] item P2.7.
