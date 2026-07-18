---
name: pdf-extract-cnc-501-indd
description: Milling order-of-operations PDF extract (stub) — CNC 501 .indd
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:56.462Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/CNC 501 .indd.pdf
  pages_extracted: 80
---

# CNC 501 .indd

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/CNC 501 .indd.pdf` — pages 1..80.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- CNC 501
- 452 South Anderson Road
- TABLE OF CONTENTS
- GENERAL SAFETY
- STANDARD OPERATING
- PROCEDURES
- SAFETY PRECAUTIONS
- PRE-POWER UP CHECKS
- CHUCK PRECAUTIONS
- DAILY CHECKS
- PRECAUTIONS FOR MACHINE OPERATION
- WORK PIECE LOADING AND UNLOADING
- AT THE END OF THE DAY
- WHEN A PROBLEM OCCURS
- OTHER GENERAL PRECAUTIONS
- OSP CONTROL FUNCTIONS
- MEMORY TEST :0000
- BOOTDEV FROA:
- LOAD:SYS
- PBU FILE ON LOADING

## First paragraph (sample)

CNC 501 Programming and Operation of Lathes York Technical College 452 South Anderson Road Rock Hill, SC 29730

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
