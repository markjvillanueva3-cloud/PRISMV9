---
name: pdf-extract-gc-2023-2024-g-milling
description: Milling order-of-operations PDF extract (stub) — GC_2023-2024_G_Milling
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:59:35.342Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Milling.pdf
  pages_extracted: 14
---

# GC_2023-2024_G_Milling

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Milling.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2023/2024
- MILLING
- J001 -
- K001 -
- L001 -
- M001 -
- I001 -
- DCONMS
- DCSFMS
- 0 / -0.4
- 7 - 25° °
- SPARE PARTS
- AH3225
- AH8015
- INSERT
- 7 - 25	° ° 7º ~ 25º
- 0.5 	0.5 	0.9 / 1 / 1.5 	1 	1.3 / 2
- 2 	4 	4 	6 	4
- 0 / 0 4
- 30 - 40HRC 	AH8015 	100 - 200 	0.2 - 0.8

## First paragraph (sample)

Tungaloy’s Insights – Smart Manufacturing Tungaloy, as one of the leaders in the metal removal industry, offers the latest innovations in grades and geometries for superb performance and tool life. Tungaloy’s latest innovations in cutting tools contribute to carbon neutrality

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
