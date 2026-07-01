---
name: feedback_xray_per_field_confidence_mandatory
description: Every blueprint/OCR extraction field must carry confidence 0..1 — downstream gates on a threshold
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_xray_per_field_confidence_mandatory
---


Standing rule for slot:xray: every extracted field (dimension, tolerance, GD&T callout, material, note) MUST emit a `confidence: 0..1` score. Downstream consumers gate on a threshold: 0.85 dimensions / 0.95 tolerances / 0.99 GD&T callouts.

**Verified shipped gates** (NOT the seed's 0.85/0.95/0.99 — those are uncorroborated defaults; see [[reference_xray_confidence_thresholds_reconciled]]): OCR per-field floor **0.70** → operator-confirm dialog (PRINT-TO-INSPECTION-PIPELINE-V2); CAD-fidelity flag <0.85; safety S(x)≥0.98; conformal-bound drift >20% → `blueprint-accuracy-guard` HARD BLOCK. Deeper mechanism = conformal prediction sets + 4-tier ground-truth (confirmed>produced>quoted>inferred).

**Why:** confidence-blind extraction hides errors. A dimension read at 0.4 confidence that flows unflagged into a quote or G-code program is a five-sigma-tier safety/cost risk. The confidence score is the only mechanism that lets a downstream gate (or operator-review queue) catch a misread before it reaches a real machine.

**How to apply:** below the 0.70 OCR floor → `cad_pdf_pattern_rescue_extract` or vision-LLM fallback (`scripts/lib/ollama-vision-extract-lib.mjs`); still below → mark the print `needs-human-review` and defer, never silently pass. Also normalize every dimension to mm (imperial input OK, imperial in the PRISM graph forbidden) and tie every FCF to its datum-3-2-1 schema. See galaxy CLAUDE.md `## Anti-patterns`.
