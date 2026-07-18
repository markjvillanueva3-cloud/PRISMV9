---
name: pdf-extract-guhring-full-catalog
description: Milling order-of-operations PDF extract (stub) — guhring full catalog
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:07:57.918Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/guhring full catalog.pdf
  pages_extracted: 14
---

# guhring full catalog

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/guhring full catalog.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1.1 bn
- 110,000

## First paragraph (sample)

2023 Edition 01 General Catalogue No liability can be accepted for printing errors or technical changes of any kind. Our Conditions of Sale and Terms of Payment apply. Available on request.

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
