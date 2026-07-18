---
name: pdf-extract-sumitomo-ac8000p
description: Lathe turning-programming PDF extract (stub) — sumitomo-ac8000p
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:25.549Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/sumitomo-ac8000p.pdf
  pages_extracted: 20
---

# sumitomo-ac8000p

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/sumitomo-ac8000p.pdf` — pages 1..20.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- AC8015P/AC8020P/AC8025P/AC8035P
- AC8020P
- TOOLING NEWS E-166
- AC8015P
- AC8025P
- AC8035P
- 5 ° 17 °
- NMU/NEM
- 0 	0,1 	0,2 	0,3 	0,4 	0,5 	0 	0,2 	0,4 	0,6 	0,8 	0 	0,2 	0,4 	0,6 	0,8 	0 	0,4 	0,8 	1,2 	1,6
- 5 min 	17 min 	29 min
- 5 min 	14 min
- CNMG120408NGU AC8015P
- CNMG120408NGU AC8020P
- 400 impacts 	1.600 impacts 	4000 impacts
- 400 impacts 	1.600 impacts
- 2 min 	70 min 	120 min
- 2 min 	70 min
- CNMG120408NGU AC8025P
- 0 	0,1 	0,2 	0,3
- 0 	250 	500

## First paragraph (sample)

AC8015P/AC8020P/AC8025P/AC8035P AC8020P TOOLING NEWS E-166 Coated Grades for Steel Turning New Grades for Steel Turning, Creating "Absolutely Stable Cutting" Introducing

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
