---
name: pdf-extract-post-processor-documentation-2021-02-04
description: Milling order-of-operations PDF extract (stub) — Post+Processor+Documentation+-+2021-02-04
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T19:57:22.978Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/Post+Processor+Documentation+-+2021-02-04.pdf
  pages_extracted: 26
---

# Post+Processor+Documentation+-+2021-02-04

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/Post+Processor+Documentation+-+2021-02-04.pdf` — pages 1..26.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1 = Output locking M codes
- 2 = Rot&Tilt
- 1 = Output braking M codes
- 1 = Output comments
- 0 = Do not output M code,
- 1 = Output M code (Only valid when rot_type = 1 instead of sign indicating
- 0 or any number = Always use this work offset number (e.g. 0 gives G54, 6 gives
- 1 = G92 at toolchanges
- 2 = G54
- 3 = Off
- 1 = Apply with rotation of plane
- 2 = Apply tool plane-based shifts in plane coordinates after rotation of plane
- 0 = Off
- 1 = On
- 2 = On, not used for Z/X tool axes
- 3 = On, not used for Z tool axis
- 1 = Vector output (5-axis only)
- 1 = Use home positions from Mastercam
- 1 = G91 G28
- 2 = G91 G30

## First paragraph (sample)

Page 2 Contents Application of this Document ....................................................................................................................... 3 General Terminology................................................................................................................................. 3 5-Axis Mill/Router Machines................................................................................................................. 3 Mill-Turn Machines ........................................................................................................................

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
