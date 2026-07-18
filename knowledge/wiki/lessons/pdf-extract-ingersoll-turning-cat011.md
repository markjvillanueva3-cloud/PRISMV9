---
name: pdf-extract-ingersoll-turning-cat011
description: Lathe turning-programming PDF extract (stub) — ingersoll-turning-cat011
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:26.722Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/ingersoll-turning-cat011.pdf
  pages_extracted: 16
---

# ingersoll-turning-cat011

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/ingersoll-turning-cat011.pdf` — pages 1..16.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- TT7220
- TT8020
- TT9030
- TT5100
- CT3000
- PV3030
- TT1300
- TT1500
- TT5030
- TT3500
- UNCOATED
- PV3010
- TT8010
- ISO / ANSI
- TT7010
- 92.7 	> 200 	53 	0.07 	460 	6.5
- 92.5 	> 210 	54 	0.08 	480 	6.0
- 91.2 	> 250 	57 	0.10 	480 	5.5
- 92.8 	> 200 	58 	0.12 	500 	5.5
- 92.1 	> 250 	57 	0.15 	490 	5.5

## First paragraph (sample)

T378  GRADES - GRADE CLASSIFICATION TAEGUline cutting tool grades are classified according to application and type of materials. There are uncoated P.M.K types based on ISO classification, coated grades for high efficiency cutting, cermets for finishing to medium cutting, ceramics, CBN & PCD for high speed cutting. The ideal choice of grade depends on the workpiece materials, cutting condition, insert geometry and the machine. Parting and Grooving T-Clamp Coated PVD TT7220 TT8020 TT9030 Uncoated K10 Turning and Grooving Uncoated K10 Coated PVD TT7220 CVD TT5100 Ceramic AB30 Cermet Uncoated CT

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
