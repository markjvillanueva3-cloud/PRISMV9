---
name: pdf-extract-okuma-osp-p200l-programming
description: Milling order-of-operations PDF extract (stub) — Okuma-OSP-P200L-Programming
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:19:25.481Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/Okuma-OSP-P200L-Programming.pdf
  pages_extracted: 16
---

# Okuma-OSP-P200L-Programming

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/Okuma-OSP-P200L-Programming.pdf` — pages 1..16.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- CNC SYSTEM
- OSP-P200L/P20L
- OSP-P200L-R/P20L-R
- PROGRAMMING MANUAL
- SAFETY PRECAUTIONS
- DANGER
- WARNING
- CAUTION
- SAFETY INSTRUCTIONS
- INTRODUCTION
- TABLE OF CONTENTS
- SECTION 1 PROGRAM CONFIGURATIONS .............................................................1
- SECTION 2 COORDINATE SYSTEMS AND COMMANDS ......................................16
- SECTION 3 MATH FUNCTIONS ...............................................................................24
- SECTION 4 PREPARATORY FUNCTIONS...............................................................40
- SECTION 5 S, T, AND M FUNCTIONS .....................................................................45
- SECTION 6 OFFSET FUNCTION .............................................................................56
- SECTION 7 FIXED CYCLES .....................................................................................96
- SECTION 8 LATHE AUTO-PROGRAMMING FUNCTION (LAP) ............................167
- SECTION 9 CONTOUR GENERATION ..................................................................235

## First paragraph (sample)

CNC SYSTEM OSP-P200L/P20L OSP-P200L-R/P20L-R PROGRAMMING MANUAL (3rd Edition) Pub No. 5238-E-R2 (LE33-013-R3) Aug. 2007

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
