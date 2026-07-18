---
name: pdf-extract-gc-2023-2024-us-drilling
description: Milling order-of-operations PDF extract (stub) — GC_2023-2024_US_Drilling
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:53:54.924Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Drilling.pdf
  pages_extracted: 80
---

# GC_2023-2024_US_Drilling

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Drilling.pdf` — pages 1..80.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- J001 -
- K001 -
- L001 -
- M001 -
- I001 -
- DCSFMS
- DCONMS
- S PA R E PA R T S
- TDXU500 - TDXU0562 CSPB-2H IP-6DB NPTF1/8 (NPTF1/4)
- TDXU-0625FS-05 CSPB-2L043 IP-6DB NPTF1/8 (NPTF1/4)
- TDXU1062 - TDXU1250 CSTB-3 T-9D NPTF1/4 (SL32IN)
- TDXU1312 - TDXU1562 CSTB-4 T-15D NPTF1/4 (SL38IN)
- TDXU1625 - TDXU2000 CSTB-5 T-20D NPTF1/4 (SL38IN)
- SPARE PARTS
- AH6030
- AH9030
- INSERT
- 150 - 250 HB 262 - 820 2D, 3D 0.0024 - 0.0047 0.0024 - 0.0047 0.0024 - 0.0059 0.0024 - 0.0071 0.0031 - 0.0079
- 150 - 250 HB 262 - 656 2D, 3D 0.0016 - 0.0047 0.0016 - 0.0047 0.0024 - 0.0059 0.0024 - 0.0071 0.0031 - 0.0079
- 66 - 197 4D, 5D 0.0016 - 0.0031 0.0016 - 0.0031 0.0016 - 0.0039 0.0016 - 0.0039 0.0016 - 0.0039

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
