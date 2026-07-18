---
name: pdf-extract-tungaloy-grade-2023
description: Lathe turning-programming PDF extract (stub) — tungaloy-grade-2023
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:21.711Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/tungaloy-grade-2023.pdf
  pages_extracted: 23
---

# tungaloy-grade-2023

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/tungaloy-grade-2023.pdf` — pages 1..23.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- P01 - P10
- K10 - K20
- P10 - P20
- M10 - M20
- P15 - P25
- M15 - M25
- P10 - P30
- M10 - M30
- P15 - P30
- M15 - M30
- P20 - P35
- M20 - M35
- P20 - P40
- M20 - M40
- P05 - P15
- M05 - M15
- K10 - K25
- S05 - S15
- K15 - K30
- S10 - S25

## First paragraph (sample)

Tungaloy A001 A002 A003 A005 A005 A006 A007 A007 A008 A020 Coated Grade / CV D Coated Grade / PVD Ceramic Cer met CBN PCD Cemented Car bide Grade comparison chart Chipbreaker comparison char t Grade

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
