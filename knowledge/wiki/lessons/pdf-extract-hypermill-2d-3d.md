---
name: pdf-extract-hypermill-2d-3d
description: Milling order-of-operations PDF extract (stub) — hyperMILL_2D_3D
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:34:54.976Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf
  pages_extracted: 18
---

# hyperMILL_2D_3D

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf` — pages 1..18.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 82234 Wessling
- 1 	New in version 2018.1
- 2 	User interface
- 3 	Basics
- 4 	Feature and macro technology
- 5 	Probing
- 6 	Turning
- 7 	Drilling
- 8 	2D machining
- 9 	3D machining
- 13 Appendix
- 14 Third Party Software Terms
- 2 	Overview 	hyperMILL: Integrated CAM Application
- 2	Supported CAD formats 	Overview
- 2 	hyperMILL and CAD program 	Starting the CAM editing
- 2	Starting the CAM editing 	hyperMILL and CAD program
- ZOLLER

## First paragraph (sample)

hyperMILL This software documentation applies to hyperMILL and hyperMILL SHOP Viewer. The content of this manual and the related software are the property of OPEN MIND Technologies AG. Any manner of reproduction shall require the prior consent of OPEN MIND Technologies AG. All rights reserved. Since we continuously work on further developments, we reserve the right to implement changes. Last reviewed: September 2017. OPEN MIND Technologies AG Argelsrieder Feld 5 82234 Wessling Germany Phone:+ 49 (0) 8153 933 -500 Fax:+ 49 (0) 8153 933 -501 Email: Sales.Europe@openmind-tech.com Web: http://www.

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
