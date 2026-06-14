---
name: pdf-extract-hypermill-manual-en-1
description: Milling order-of-operations PDF extract (stub) — hyperMILL_Manual-en-1
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:51:28.488Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/hyperMILL_Manual-en-1.pdf
  pages_extracted: 16
---

# hyperMILL_Manual-en-1

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/hyperMILL_Manual-en-1.pdf` — pages 1..16.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1 	2 	3
- 1 	2
- 3 Points: Specify the frame orientation with three points. Point 1 = origin, Point 2 = X direction, Point 3 = Y

## First paragraph (sample)

4. Basics of CAM editing Overview: From the model to the NC program The modular structure of hyperMILL creates a flexible workflow from the model to the NC program. Important elements of this workflow include: 1. CAM/CAD system 2. Specifying the basic settings Define the measurement system and storage directories for hyperMILL data. Configure the dia- logue control, configure the tool and macro database and define further basic settings. 3. Define workpiece origin and frame(s) With the origin reference system (NC system), establish a connection to the machine coordinate system. Using a frame, 

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
