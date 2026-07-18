---
name: pdf-extract-gc-2023-2024-us-milling
description: Milling order-of-operations PDF extract (stub) — GC_2023-2024_US_Milling
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:53:10.945Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Milling.pdf
  pages_extracted: 80
---

# GC_2023-2024_US_Milling

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Milling.pdf` — pages 1..80.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- J001 -
- K001 -
- L001 -
- M001 -
- I001 -
- DCONMS
- C-ACLNN
- C-ACLNR/L
- OTHERS
- SPARE PARTS
- BXA10 BXA20
- CBN CBN
- T515 T515 T515
- NS9530 GT9530 T9215 T9215
- TF TSF TM TH
- BX470 AH8005 AH8005
- CBN HRF HRM
- DX120 DX140 TH10
- DIA DIA P
- T6215 AH6225 AH6225

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
