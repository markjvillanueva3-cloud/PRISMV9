---
name: pdf-extract-hypermill-manual-en-2
description: Milling order-of-operations PDF extract (stub) — hyperMILL_Manual-en-2
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:51:33.742Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/hyperMILL_Manual-en-2.pdf
  pages_extracted: 16
---

# hyperMILL_Manual-en-2

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/hyperMILL_Manual-en-2.pdf` — pages 1..16.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1 	2 	3
- 3 	3
- 1 	2
- 3 	4
- 3 	1
- 2 	3
- 1 	2 	3 	4
- 0 	1 0 	1
- 2 	2

## First paragraph (sample)

7. Turning Turning is a production process for manufacturing rotationally symmetrical internal and external surfaces by removing material from turning stock of any shape. The external shape of a workpiece is created by using the Outside option, and the internal shape by using the Inside option. The millTURN module allows for the combination of milling and turning tasks in a job list. Stockmodel for subsequent machining tasks: As with milling jobs, a stockmodel can also be generated for subsequent turning operations (resulting stock). NC files: The NC files created with the millTURN module can 

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
