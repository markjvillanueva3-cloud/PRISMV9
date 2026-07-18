---
name: feedback_xray_multi_print_split_before_ocr
description: Split multi-print container PDFs into single prints BEFORE OCR — one extraction result per print
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_xray_multi_print_split_before_ocr
---


Standing rule for slot:xray: a JM Die "PDF" is frequently a multi-print container (phase21 split 8,154 containers → 36,638 single prints; 8,431 multi-print containers identified). ALWAYS split first; emit one OCR/extraction result object per print.

**Why:** a single output object spanning N different prints cross-contaminates features/tolerances/materials across parts and corrupts every downstream consumer (quote, program, inspection). The corruption is silent — the extraction "succeeds" but the data is mixed.

**How to apply:** step 2 of the extraction pipeline is always the split via `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf page-by-page, [[feedback_use_lima_pypdf_page_extractor]]) orchestrated by `docustrata-pipeline.py`. Then loop per-print. Do NOT cite the unverified "96%" figure — use the real counts ([[reference_xray_docustrata_96pct_unverified]]).
