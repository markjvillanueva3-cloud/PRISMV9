---
name: pdf-extract-autodesk-cncbook
description: Milling order-of-operations PDF extract (stub) — Autodesk_CNCBOOK
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T19:58:29.579Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/Autodesk_CNCBOOK.pdf
  pages_extracted: 60
---

# Autodesk_CNCBOOK

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- ISBN-13: 978-0-615-50059-1
- ISBN-10: 0615500595
- Chapter 1:
- Chapter 2:
- Part Datum .............................................................. 8-11
- Appendix A:
- Appendix B:
- Appendix C:
- Appendix D:
- Appendix E:
- Appendix F:
- 1.1 Course Description
- 1.2 Required Tools and Equipment
- 1.3 Lessons & Appendices
- 1 – Overview/Resources
- 2 – Shop Safety
- 3 – Coordinate Systems
- 4 – CNC Programming Language
- 5 – CNC Tools
- 6 – CNC Operation

## First paragraph (sample)

Fundamentals of CNC Machining A Practical Guide for Beginners Compliments of NexGenCAM, Inc.

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
