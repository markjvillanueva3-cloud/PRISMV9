---
name: pdf-extract-gc-2023-2024-g-tooling
description: Milling order-of-operations PDF extract (stub) — GC_2023-2024_G_Tooling
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:00:06.066Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Tooling.pdf
  pages_extracted: 14
---

# GC_2023-2024_G_Tooling

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_G_Tooling.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2023/2024
- J001 -
- K001 -
- L001 -
- M001 -
- I001 -
- DCONMS
- DCONMS LF L2 WF DMIN DMIN2 RE
- C-PCLNR/L
- C-ACLNR/L
- SPARE PARTS
- C-PCLNR/L-CHP
- DCONMS LF L2 WF DMIN RE
- C-ACLNN
- COOLANT SET
- DCSFMS
- DIN6987140ER20X100B 40 ER20 1-13 100
- DIN6987150ER20X100 (1) 50 ER20 1-13 100
- DIN6987150ER20X100B 50 ER20 1-13 100
- DIN6987150ER20X160 (1) 50 ER20 1-13 160

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
