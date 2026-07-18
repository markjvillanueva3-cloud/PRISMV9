---
name: pdf-extract-programming-manual-fundamentals
description: Milling order-of-operations PDF extract (stub) — Programming Manual Fundamentals
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T19:58:27.556Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/Programming Manual Fundamentals.pdf
  pages_extracted: 60
---

# Programming Manual Fundamentals

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/Programming Manual Fundamentals.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- SINUMERIK
- SINUMERIK 828D
- 03/2013
- 6FC5398-1BP40-3BA1
- Appendix A
- 90026 NÜRNBERG
- GERMANY
- DANGER
- WARNING
- CAUTION
- NOTICE
- 4 	Programming Manual, 03/2013, 6FC5398-1BP40-3BA1
- 6 	Programming Manual, 03/2013, 6FC5398-1BP40-3BA1
- 1.4.6 	What is the relationship between the various coordinate systems? ............................................31
- 8 	Programming Manual, 03/2013, 6FC5398-1BP40-3BA1
- 4.2.1 	Tool change with T command with active tool management (option)......................................... 56
- 6.3 	Constant cutting rate (G96/G961/G962, G97/G971/G972, G973, LIMS, SCC) ......................... 92
- 6.4 	Constant grinding wheel peripheral speed (GWPSON, GWPSOF)............................................ 97
- 7.1 	Feedrate (G93, G94, G95, F, FGROUP, FL, FGREF).............................................................. 101
- 7.2 	Traverse positioning axes (POS, POSA, POSP, FA, WAITP, WAITMC) ................................. 110

## First paragraph (sample)

SINUMERIK SINUMERIK 840D sl / 828D Fundamentals Programming Manual Valid for Control SINUMERIK 840D sl / 840DE sl SINUMERIK 828D Software Version CNC software 4.5 SP2 03/2013 6FC5398-1BP40-3BA1 Preface Fundamental Geometrical Principles 1 Fundamental Principles of NC Programming 2 Creating an NC program 3 Tool change 4 Tool offsets 5 Spindle motion 6 Feed control 7 Geometry settings 8 Motion commands 9 Tool radius compensation 10 Path action 11 Coordinate transformations (frames) 12 Auxiliary function outputs 13 Supplementary commands 14 Other information 15 Tables 16 Appendix A

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
