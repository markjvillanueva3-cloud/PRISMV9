---
name: pdf-extract-gc-2023-2024-g-drilling
description: Milling order-of-operations PDF extract (stub) — GC_2023-2024_G_Drilling
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:00:01.545Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Drilling.pdf
  pages_extracted: 14
---

# GC_2023-2024_G_Drilling

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Drilling.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2023/2024
- J001 -
- K001 -
- L001 -
- M001 -
- I001 -
- DCSFMS
- DCONMS
- DC DCONMS DCSFMS LU LS DMP/H/N DMC DMF
- S PA R E PA R T S
- DC DCONMS LU LS DMP/H/N DMC DMF
- SPARE PARTS
- AH6030
- AH9030
- INSERT
- 160 - 320 2D, 3D 0.02 - 0.06 0.02 - 0.06 0.04 - 0.1 0.04 - 0.1 0.04 - 0.1
- 80 - 250 2D, 3D 0.04 - 0.1 0.04 - 0.12 0.06 - 0.13 0.06 - 0.15 0.08 - 0.18
- 160 - 250 2D, 3D 0.04 - 0.08 0.04 - 0.08 0.06 - 0.12 0.06 - 0.12 0.06 - 0.14
- 80 - 200 2D, 3D 0.04 - 0.1 0.04 - 0.12 0.06 - 0.13 0.06 - 0.15 0.08 - 0.18
- 100 - 200 2D, 3D 0.02 - 0.08 0.02 - 0.08 0.04 - 0.1 0.04 - 0.12 0.04 - 0.12

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
