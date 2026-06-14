---
name: reference_xray_pypdf_canonical_extractor_path
description: The canonical multi-print pypdf extractor is scripts/extract-jm-die-corpus-page-by-page.py (NOT a .mjs)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.074Z
aliases: reference_xray_pypdf_canonical_extractor_path
---


The "lima pypdf page-by-page extractor" referenced fleet-wide ([[feedback_use_lima_pypdf_page_extractor]]) is a **Python** script, not the phantom `scripts/lima-pypdf-page-extract.mjs` the seed named. Verified real path (2026-05-29):

- `H:/prism/scripts/extract-jm-die-corpus-page-by-page.py` — canonical pypdf page-by-page corpus extractor (76× deeper than pdf-parse).
- `H:/prism/scripts/lib/pdf-to-png.py` — PDF→PNG rasterizer that feeds OCR.
- `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs` — Ollama vision OCR extraction core (low-confidence fallback).
- `H:/prism/scripts/lib/blueprint-extractor-lib.mjs` (+ `blueprint-extract-io.mjs`) — blueprint extractor core + I/O.

Orchestrated by `docustrata-pipeline.py` (7-stage cost-cascade: delta-detect → page-count → text-density → deep-rescan → verified-rollup → split-containers → gpu-ocr). See [[reference_docustrata_pipeline_2026_05_16]] · galaxy PATHS.md.
