---
name: Docustrata PDFs are container documents with multiple prints inside
description: 96% of Docustrata PDFs are multi-page; many contain 5-10 separate engineering drawings buried beyond page 1. Page-1-only extraction (Phase 3c) missed ~24,186 docs / 120K candidate pages. Always scan ALL pages for embedded prints.
type: reference
originSessionId: d9860be8-11f1-48b5-be7d-f29706fa27e5
---
# Docustrata corpus structure — container-PDF reality

JM Die's Docustrata cloud archive (`H:/PRISM/Docustrata/`, 111,745 PDFs, 89 GB) is **not** one-document-per-file. The Evernote → Docustrata import process bundled multiple physical scans into single multi-page PDFs.

## Audit results (2026-05-09)

- **107,312 PDFs (96%)** are ≥2 pages
- **30,305 PDFs** are ≥5 pages
- Of the 41,040 multi-page PDFs in SCAN_GENERIC + UNKNOWN + IMPORTED_BATCH buckets:
  - **24,186 (59%)** have at least one suspected drawing page on page 2+ that page-1-only extraction missed
  - **120,487 candidate pages** total need deep-scan
- A single container PDF can hold 5-10 separate engineering drawings

Example: `2026_05_07_12_53_28.pdf` had real JM Die drawings on pages 11, 23, 25, 29, 33 — five distinct drawings in one PDF, all missed by Phase 3c.

## Why Phase 3c missed them

`phase3c-vision-titleblock.py` only rendered `doc[0]` (page 1) of each PDF. A PDF whose page 1 was a sales-order header got tagged `SALES_ORDER` and never re-examined, even when pages 5-15 were the actual prints.

## How to apply going forward

For ANY Docustrata multi-page PDF, run the 3-tier classifier:
- Script: `H:/PRISM/Docustrata/.index/phase8-tiered-blueprint-classifier.py`
- Future PRISM engine: `BlueprintMultiTierClassifierEngine` (port from prototype)

The tiers:
1. **Image heuristic** (50ms/page, free): black-pixel density + edge density gives drawing-likelihood score. Reject pages <0.3 score.
2. **Tesseract title-block OCR** (1-2s/page, free): crop bottom-right 35%, OCR with Tesseract, search for "PART NO", "DRAWING", "REV", "SCALE", "MATERIAL". 2+ strong indicators = drawing.
3. **Vision LLM** (10s/page, GPU): only for ambiguous cases (Tier 1 high but Tier 2 low). Currently deferred — needs llama3.2-vision re-pull.

**Validated yield (1000-page sample, 2026-05-09):** Tier 1 passes 49.8%, Tier 2 confirms 4.5% as drawings. Sample drawings looked unmistakably real (KAD initials, DC-/PF-/MCF- prefixes typical of JM Die).

**Why this matters:** Print → CNC training corpus expected to grow from **228 → ~5,400+ verified prints** when Phase 8 finishes (5.7 hours of CPU time, no GPU needed for Tiers 1-2).

## Cross-references

- `phase6-pdf-page-audit.py` → `pdf-page-counts.jsonl` (page counts for all 111K PDFs)
- `phase7-text-density-scan.py` → `phase7-drawing-candidates.jsonl` (24K docs flagged for deep-scan)
- `phase8-tiered-blueprint-classifier.py` → `phase8-classified-pages.jsonl` (per-page classification)
- Existing PRISM engines that should consume this: `BlueprintOCREngine`, `BlueprintVisionOCREngine`, `Drawing2DExtractionEngine`, `LathePrintIngestPipelineEngine`
- Existing skills: `/pdf-learn`, `/blueprint-read`, `/print-to-program`, `/extract-dark-content`
