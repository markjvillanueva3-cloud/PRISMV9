---
name: pdf-extract-winmax-mill-intro-class-workbook
description: Milling order-of-operations PDF extract (stub) — WinMax-Mill-Intro-Class-Workbook
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:34:53.298Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/WinMax-Mill-Intro-Class-Workbook.pdf
  pages_extracted: 18
---

# WinMax-Mill-Intro-Class-Workbook

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/WinMax-Mill-Intro-Class-Workbook.pdf` — pages 1..18.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- INTRODUCTION
- 2 - Introduction Class Worksheets Hurco Machining Centers Introduction
- 2 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 4 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 6 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 8 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- ISNC G74
- 10 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 12 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 14 - Introduction Class Worksheets Machine Hurco Machining Centers Introduction
- 6061 (T1-T3) Max Rpm .005 .0025
- 6061 (T4-T6) Max Rpm .010 .005
- 7075 Max Rpm .010 .005
- 4130 260 .0015 .0005
- 4140 220 .0015 .0005
- 4340 280 .0015 .0005
- 304 225 .001 .0005
- 316 240 .001 .0005
- 6 AL-4V 400 .002 .0015
- 6 AL-6V 230 .0005 .0003

## First paragraph (sample)

November 2013 Class Worksheets Revision A INTRODUCTION Hurco Machining Centers and Conversational Part Programming WinMax Mill Class Worksheets

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
