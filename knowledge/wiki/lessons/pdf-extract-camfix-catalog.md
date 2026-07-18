---
name: pdf-extract-camfix-catalog
description: Milling order-of-operations PDF extract (stub) — CAMFIX_Catalog
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:08:00.708Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/CAMFIX_Catalog.pdf
  pages_extracted: 14
---

# CAMFIX_Catalog

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/CAMFIX_Catalog.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- TURNING GROOVE
- GROOVE
- YOU MACHINING
- ISO 9001:
- THE STANDARDS INSTITUTION OF ISRAEL
- 45001:2018
- ISO 14001:
- AS 9100
- ISO 27001
- TURNING TOOLS (ISO)
- CONTENTS
- ISCAR2
- DCONMS
- ISCAR4
- PSI MAX
- ISCAR6
- ISCAR8
- ISCAR10
- ISCAR12

## First paragraph (sample)

TURNING GROOVE TURN THREADING TOOLING w w w . i s c a r. c o m FACE GROOVE ISCAR CAMFIX Metric · Imperial YOU MACHINING INTELLIGENTLY? Modular Quick and Rigid Tooling System

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
