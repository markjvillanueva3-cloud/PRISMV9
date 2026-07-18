---
name: pdf-extract-me32-123-r07a
description: Milling order-of-operations PDF extract (stub) — ME32-123-R07a
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:23.847Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/ME32-123-R07a.pdf
  pages_extracted: 50
---

# ME32-123-R07a

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/ME32-123-R07a.pdf` — pages 1..50.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- CNC SYSTEM
- OSP-P300S/P300M
- CONTENTS
- SECTION 1 	TURNING CUT FUNCTION....................................................................1
- SECTION 2 	SECOND TOOL LENGTH OFFSET FOR TURNING CUT...................15
- SECTION 3 	NOSE RADIUS COMPENSATION .......................................................20
- SECTION 4 	2-ROTARY TABLE CONTROL FUNCTION..........................................54
- SECTION 5 	INVERSE TIME FEED FUNCTION ......................................................62
- SECTION 6 	SYNCHRONIZED MULTIAXIS FUNCTION ..........................................66
- SECTION 7 	MANUAL FEED FUNCTION IN TOOL AXIAL DIRECTION..................77
- SECTION 8 	Hi-G FUNCTION IN LOW-VIBRATION MODE .....................................85
- SECTION 9 	FIXED CYCLE TIME REDUCING FUNCTION .....................................88
- SECTION 10 	STRAIGHT ANGLE COMPENSATION FUNCTION .............................93
- SECTION 11 	ATTACHMENT LOAD DISPLAY FUNCTION........................................99
- SECTION 12 	SHORTER PATH COMMAND TO ROTARY TABLE...........................104
- SECTION 13 	FIXED DEEP HOLE DRILLING CYCLE 2 ..........................................106
- SECTION 14 	SYNCHRONIZED TAPPING FUNCTION FOR DEEP HOLES........... 113
- SECTION 15 	G33 THREAD CUTTING FUNCTION.................................................129
- SECTION 16 	TOOL NOSE INCOMPLETE PORTION OFFSET FUNCTION...........136
- SECTION 17 	INTERRUPT PROGRAM FUNCTION ................................................141

## First paragraph (sample)

CNC SYSTEM OSP-P300S/P300M SPECIAL FUNCTIONS MANUAL No. 2 (7th Edition) Pub No. 6103-E-R6 (ME32-123-R7) Oct. 2014

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
