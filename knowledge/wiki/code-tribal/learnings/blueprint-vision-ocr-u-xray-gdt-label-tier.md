# BLUEPRINT-VISION-OCR/U-XRAY-GDT-LABEL-TIER — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-LABEL-TIER (slot:xray): tier GD&T frames as trainable LoRA labels (image -> FCF text) -- buildTrainsetRow -> runner JSONL -> LoRA pairs

**Commit:** `abc63f4874c6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T03:33:27-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-label-tier, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-LABEL-TIER (slot:xray): tier GD&T frames as trainable LoRA labels (image -> FCF text) -- buildTrainsetRow -> runner JSONL -> LoRA pairs

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-LABEL-TIER (slot:xray): tier GD&T frames as trainable LoRA labels (image -> FCF text) -- buildTrainsetRow -> runner JSONL -> LoRA pairs

The closed-loop OCR corpus was DIMENSION-ONLY: U-XRAY-ENSEMBLE-NONDIM-UNION made the ensemble
fuse carry gd&t/notes, but buildTrainsetRow only recorded COUNTS -- GD&T frames never became
trainable labels, so the corpus could never train GD&T reading (the operator-flagged "missed
features"). This closes that: every consensus GD&T frame becomes a trainable label, end-to-end
to the LoRA training pairs.

Vertical slice (R13 logical order, R15 reach the destination):
- ocr-training-loop-lib.mjs: new pure buildFcfText(g) renders a canonical ASCII FCF ground-truth
  string ("position 0.1mm MMC [A|B]"; raw_text fallback). buildTrainsetRow emits gdt_labels[],
  each tiered by the SAME corroboration gate + assignLabelTier the dimensions use (agreement_fraction
  = corroboration/n_models); trainable = corroboration-possible + gold/silver. Tagged
  calibration_basis:"dimension-agreement" (R12 honesty -- the isotonic curve is dimension-derived,
  NOT GD&T-specific; per-type calibration is a future unit). aggregateTrainingLoop rolls up
  trainable_gdt_labels.
- blueprint-ocr-training-loop.mjs (runner): persists trainable gdt_labels into the trainset JSONL
  row, appends a row when EITHER trainable dims OR trainable gdt labels exist, surfaces
  this_run_trainable_gdt_labels in the report.
- trainset-to-lora-pairs.mjs: emits one {extractionType:"gdt", groundTruthValue:fcf_text} LoRA pair
  per trainable gdt_label (guard relaxed to handle a gdt-only row; dim path byte-identical).

Tests: ocr-training-loop-lib 38/38 (9 new) + trainset-to-lora-pairs 12/12 (4 new) -- happy + >=3
failure + >=2 adversarial (single-model zero, singleton-flagged-silver, gdt-only row, malformed,
mixed dim+gdt distinct pairIds). Per-file 2-arm scrutiny each file (all PASS, 0 P0/P1). LIVE
destination proof through the REAL modules: a corroborated GD&T frame -> trainable gdt_label ->
LoRA pair {type:gdt, gt:"position 0.1mm MMC [A|B]"} (DESTINATION REACHED). Blast-radius sweep
green (vision-ensemble-fuse 43, both consumers array-guard labels). Builds on U-XRAY-ENSEMBLE-NONDIM-UNION.

Deferred P2s (logged): per-line log/cursor trainable counts dims only (report surfaces gdt); pairId
:gdt: vs :type: collision structurally-impossible-by-convention; build-ocr-gold-verify-package has
no GD&T operator-confirm surface yet (follow-up).
```

## Files touched (6)
- scripts/blueprint-ocr-training-loop.mjs     | 10 +++++++--
- scripts/lib/ocr-training-loop-lib.mjs       | 59 ++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ocr-training-loop-lib.test.mjs  | 84 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/trainset-to-lora-pairs.mjs      | 26 ++++++++++++++++++++--
- scripts/lib/trainset-to-lora-pairs.test.mjs | 48 +++++++++++++++++++++++++++++++++++++++
- 5 files changed, 223 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show abc63f4874c6`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._