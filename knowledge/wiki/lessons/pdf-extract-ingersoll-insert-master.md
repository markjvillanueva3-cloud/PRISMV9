---
name: pdf-extract-ingersoll-insert-master
description: Lathe turning-programming PDF extract (stub) — ingersoll-insert-master
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:27.748Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/ingersoll-insert-master.pdf
  pages_extracted: 60
---

# ingersoll-insert-master

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/ingersoll-insert-master.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- TT8105
- TT8115
- TT8125
- TT8135
- TT7100
- TT5100
- TT5080
- TT9215
- TT9235
- TT9225
- TT9080
- TT7015
- TT7005
- TT7005,TT7015
- TT9215,TT9225,
- TT8105, TT8115, TT8125,
- TB670, KB90A, TB730
- AW120, AB30, AS500, SC10, AS10
- TT7005, TT7015(TT7310)
- CT3000, PV3010

## First paragraph (sample)

Contents New Grades 4-9 Grades 10-13 Chipbreakers 14-20 Insert Geometry by Workpiece Shape 21 Insert Failure Trouble Shooting 22-23 Workpiece Material Groups 24-25 Insert Selection by Workpiece Materials 26-79 Insert Item List 80-132 Grade & Chipbreaker Comparison Table 133-136 Material & Hardness conversion table 137-148

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
