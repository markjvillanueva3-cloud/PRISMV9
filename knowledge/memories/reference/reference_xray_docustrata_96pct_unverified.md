---
name: reference_xray_docustrata_96pct_unverified
description: The "96% of PDFs are multi-print containers" claim is NOT supported by the docustrata ledger
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.068Z
aliases: reference_xray_docustrata_96pct_unverified
---


The "96% of incoming PDFs are multi-print containers" framing (in the xray soul + seed CLAUDE.md) **conflates two real-but-distinct figures** — that was the seed's error, not that 96% is unsourced.

- **"96%" is real but means multi-PAGE prevalence** — per `BLUEPRINT-OCR-TRAINING-MS1` (~96% of Docustrata PDFs are multi-page; single PDFs hold 5–10 prints buried on pages 2+; a page-1-only pass missed 24,186 docs / 120K pages).
- **The container split is a different figure** — phase21 split **8,154 container PDFs → 36,638 single prints** (0 errors); **8,431 multi-print containers / 42,973 verified print pages / 75,122 unique strong PNs** (`reference_docustrata_pipeline_2026_05_16`).

Doctrine is unchanged in spirit (multi-print containers are common, split before OCR). The fix is precision: cite the multi-PAGE figure for page-prevalence claims and the container-split counts for container claims — don't fuse them into "96% are multi-print containers." Reconciled across galaxy CLAUDE.md + MEMORY.md + soul + GSD 2026-05-29. See [[reference_docustrata_pipeline_2026_05_16]] · [[feedback_xray_multi_print_split_before_ocr]].
