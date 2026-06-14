---
name: blueprint-vision-extraction-confidence
type: architecture
domain: blueprint-vision
audience: [xray, delta, kilo, charlie, quality]
authored_by: xray
authored_on: 2026-05-29
related:
  - blueprint-vision-galaxy
  - blueprint-vision-multi-print-discipline
  - domain-tolerance
---

# Extraction confidence + canonical-units + datum-tie doctrine

**Why this exists:** an extracted dimension or tolerance that flows unflagged into a quote or G-code program is a five-sigma-tier safety/cost risk. Confidence scoring + unit normalization + datum-tie validation are the three gates that catch a misread before it reaches a real machine.

**Where to use it:** the output contract of every xray extraction — and the input contract every downstream consumer (charlie/quote, kilo/program, quality/inspection) should enforce.

## Per-field confidence is mandatory

Every extracted field (dimension, tolerance, GD&T callout, material, note) MUST carry `confidence: 0..1`. The **verified shipped gates** (PRINT-TO-INSPECTION-PIPELINE-V2 + `blueprint-accuracy-guard.mjs`):

| Gate | Threshold | Action |
|------|-----------|--------|
| OCR per-field floor | **0.70** | below → operator-confirm dialog w/ highlighted region |
| CAD fidelity score | < 0.85 | flag for operator review before continuing |
| Safety output S(x) | ≥ 0.98 | shop_floor tier (feed/speed → machine) |
| Conformal bound drift | > 20% widening vs rolling 50-sample | `blueprint-accuracy-guard` HARD BLOCK (`PRISM_BLUEPRINT_DRIFT_WIDEN_PCT`) |

Below the OCR floor → `prism_cad:cad_pdf_pattern_rescue_extract` or vision-LLM fallback (`scripts/lib/ollama-vision-extract-lib.mjs`); still below → mark `needs-human-review` and defer. **Never silently pass** a low-confidence field.

> **Provenance note (R12):** an earlier galaxy-seed draft asserted per-field-class thresholds "0.85 dims / 0.95 tolerances / 0.99 GD&T". Those are reasonable *consumer-set defaults* but are **NOT corroborated by any shipped gate** — the on-disk operative floor is 0.70 (OCR) + conformal-bound drift. The deeper mechanism in BLUEPRINT-OCR-TRAINING-MS1 is conformal prediction sets + 4-tier ground-truth stratification (`confirmed > produced > quoted > inferred`), not fixed per-field cutoffs. See [[reference_xray_confidence_thresholds_reconciled]].

## Canonical units = mm

Imperial input is allowed; imperial in the PRISM graph is **forbidden**. Normalize every dimension to mm at the extraction boundary. (JM Die STEP files are often inch / `CONVERSION_BASED_UNIT 25.4mm` per delta's convention — convert, don't assume mm.)

## GD&T callouts tie to a datum schema

A bare Feature Control Frame without its datum-3-2-1 reference is meaningless. Tie every FCF to its datum schema at parse time (`cad_gdt_callout_parse` + `cad_fcf_validate`).

## Silent-empty-parse guard

Many CAD parsers return empty geometry on an unsupported feature WITHOUT erroring. Cross-check extracted geometry volume vs source-file size; flag if implausible. A parser's silent success is not a success.
