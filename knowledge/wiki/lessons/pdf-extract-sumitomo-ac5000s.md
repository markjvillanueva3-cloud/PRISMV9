---
name: pdf-extract-sumitomo-ac5000s
description: Lathe turning-programming PDF extract (stub) — sumitomo-ac5000s
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:24.485Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/sumitomo-ac5000s.pdf
  pages_extracted: 20
---

# sumitomo-ac5000s

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/sumitomo-ac5000s.pdf` — pages 1..20.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- AC5005S
- AC5005S/AC5015S/AC5025S
- TOOLING NEWS E-167
- AC5015S
- AC5025S
- AC510U
- AC520U
- AC1030U
- AC6040M
- ABSOTECHTM
- 0 	5 	10 	15 	20 	25
- 0 	5 	10 	15 	20
- 1 	3 	5 	7 	30	10 	50
- 2 x longer
- 0 	5 	10 	15 	20 	25 	30 	35
- CNMG120408
- 20 	2
- CNMG 190616 NEG
- CNMG 120408 NUP
- TNMG 160408 NEF

## First paragraph (sample)

AC5005S AC5005S/AC5015S/AC5025S Coated Grades for Exotic Alloys TOOLING NEWS E-167 New Grades for Exotic Alloy Turning, Creating „Absolutely Stable Cutting“ Introducing

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
