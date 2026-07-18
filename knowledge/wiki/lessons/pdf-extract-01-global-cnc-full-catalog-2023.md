---
name: pdf-extract-01-global-cnc-full-catalog-2023
description: Milling order-of-operations PDF extract (stub) — 01-Global-CNC-Full-Catalog-2023
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:08:07.566Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/01-Global-CNC-Full-Catalog-2023.pdf
  pages_extracted: 14
---

# 01-Global-CNC-Full-Catalog-2023

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/01-Global-CNC-Full-Catalog-2023.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- DRIVEN TOOLHOLDERS
- STATIC TOOLHOLDERS
- VDI TOOLHOLDERS
- TOOLHOLDER BUSHINGS
- BORING BAR SLEEVES
- STRAIGHT SHANK
- COLLET CHUCKS
- ENDMILL EXTENSIONS
- MACHINE TOOLING
- OUR STORY
- GLOBAL CNC TODAY
- OUR FOCUS
- 15150 Cleat Street, Plymouth MI 48170
- OUR PRODUCTS
- STATIC BOLT-ON TOOL BLOCKS
- LIVE TOOLING
- VDI TOOL HOLDERS
- TOOL HOLDER BUSHINGS/SLEEVES
- THE GLOBAL CNC QUALITY DIFFERENCE
- TAILOR MADE TOOL HOLDERS

## First paragraph (sample)

DRIVEN TOOLHOLDERS STATIC TOOLHOLDERS VDI TOOLHOLDERS TOOLHOLDER BUSHINGS BORING BAR SLEEVES STRAIGHT SHANK COLLET CHUCKS ENDMILL EXTENSIONS ENDMILL EXTENSIONS MACHINE TOOLING P R O D U C T C A T A L O G F A M I L Y O W N E D | A M E R I C A N M A D E

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
