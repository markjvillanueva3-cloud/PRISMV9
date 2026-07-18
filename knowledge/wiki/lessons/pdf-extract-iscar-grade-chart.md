---
name: pdf-extract-iscar-grade-chart
description: Lathe turning-programming PDF extract (stub) — iscar-grade-chart
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:20.134Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/iscar-grade-chart.pdf
  pages_extracted: 1
---

# iscar-grade-chart

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/iscar-grade-chart.pdf` — pages 1..1.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- INDEXABLE
- MILLING
- CUTTERS
- IC4100 (5100)
- DT7150
- IC4050
- IC928 (830)
- IC808 (908)
- DRILLING
- IC8080(1) (9080)
- PARTING
- IC830 (928) 1028
- GROOVE
- FACING
- ISO TURNING
- IB25HC
- THREADING
- GROOVING
- ISOTURN
- IC300PVD COATED

## First paragraph (sample)

Grades for Applications and Materials Material Groups Main Applications ISO P ISO H ISO M ISO S ISO K ISO N 1-11 Steel 38-41 Hard Steel 12-14 Stainless Steel 31-37 High Temp. 15-20 Cast Iron 21-28 Nonferrous INDEXABLE MILLING CUTTERS Harder Harder Harder Harder Harder Harder IC908 (808) IB55 IC908 (808) IC08 IS8 IC4100 (5100) DT7150 ID5 ID8 IC07 IC08 IC30N IC4050 IC928 (830) IC808 (908) IC30N IB85 IC928 (830) IC830 (928) IC328 (330) IC330 (328) IC330 (328) IC808 (908) IC28 IC28 IC810 (910) IC28 Tougher Tougher Tougher Tougher Tougher Tougher DRILLING Harder IC8080(1) (9080) IC808 (908) IC808 (

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
