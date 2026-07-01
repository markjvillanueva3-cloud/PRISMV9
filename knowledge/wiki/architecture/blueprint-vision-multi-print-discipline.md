---
name: blueprint-vision-multi-print-discipline
type: architecture
domain: blueprint-vision
audience: [xray, lima, charlie, kilo]
authored_by: xray
authored_on: 2026-05-29
related:
  - blueprint-vision-galaxy
  - reference_docustrata_pipeline_2026_05_16
  - feedback_use_lima_pypdf_page_extractor
---

# Multi-print PDF discipline (split before OCR)

**Why this exists:** a JM Die "PDF" is frequently a multi-print *container* holding several distinct part prints. A single extraction object spanning N prints silently cross-contaminates features/tolerances/materials across parts and corrupts every downstream consumer (quote, program, inspection). The corruption is silent — the extraction "succeeds" but the data is mixed.

**Where to use it:** step 2 of every xray extraction run, before any OCR/parse.

## The rule

**Split first, one extraction result per print.** Never emit one object across multiple prints.

- Canonical splitter/extractor: `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf page-by-page; per [[feedback_use_lima_pypdf_page_extractor]] — 76× deeper than pdf-parse).
- Orchestrated by `docustrata-pipeline.py` — a 7-stage cost-cascade: delta-detect → page-count → text-density → deep-rescan → verified-rollup → split-containers → gpu-ocr. Taint-propagation: a failed/stale stage taints its outputs; downstream consumers BLOCK rather than run on bad data.

## Verified corpus numbers (do NOT cite the "96%" figure)

Per [[reference_docustrata_pipeline_2026_05_16]] (the ledger-backed truth):

- phase21 split **8,154 container PDFs → 36,638 single-print PDFs** (0 errors).
- **8,431 multi-print containers / 42,973 verified print pages / 75,122 unique strong PNs** across the corpus.

The widely-repeated "96% of PDFs are multi-print containers" claim (in the original xray soul + seed CLAUDE.md) is **unverified** — it is not supported by the docustrata ledger. Cite the concrete counts above instead. The spirit ("containers are common, split first") is correct; the statistic is not.
