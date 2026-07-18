---
name: pdf-extract-function-catalog
description: Milling order-of-operations PDF extract (stub) — function-catalog
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T19:58:33.681Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/function-catalog.pdf
  pages_extracted: 60
---

# function-catalog

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/function-catalog.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- THE FACTORY AUTOMATION COMPANY

## First paragraph (sample)

THE FACTORY AUTOMATION COMPANY Power Motion i-A CNC Series 30i/ 31i/ 32i-MODEL B Plus CNC Series 0i-MODEL F Plus CNC Series 35i-MODEL B CNC Controls Functions • Communication • Software

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
