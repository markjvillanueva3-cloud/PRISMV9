---
name: pdf-extract-basic-3d-machining
description: Milling order-of-operations PDF extract (stub) — Basic_3D_Machining
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:34:04.574Z
  source_pdf: H:/PRISM/resources/RESOURCE PDFS/Basic_3D_Machining.pdf
  pages_extracted: 18
---

# Basic_3D_Machining

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/RESOURCE PDFS/Basic_3D_Machining.pdf` — pages 1..18.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- Part Number: X5-PDF-TUT-3M
- I N T R O D U C T I O N
- 2 • BASIC 3D MACHINING
- 1 	Start Mastercam using your preferred method:
- 2 	Select the metric configuration file:
- 4 • BASIC 3D MACHINING
- Section 1
- 6 • BASIC 3D MACHINING
- 1 	Open the tutorial part file Basic_3D_Machining_Part1_Start.MCX-5, which was
- 8 • BASIC 3D MACHINING
- 2 	Click OK if prompted to switch to a metric
- 3 	Choose Machine Type, Mill, Default to
- 4 	Choose File, Save As, and save the part under a different file name. This protects the
- 1 	In the Toolpath Manager, select Stock
- 2 	Click Bounding box.
- 3 	Set the options and parameters as shown,
- 4 	Click OK in the Machine Group Properties
- 10 • BASIC 3D MACHINING
- 5 	Press [Alt+F1], or right-click and select Fit, to fit the geometry to the screen.
- 6 	Choose File, Save or click the Save button

## First paragraph (sample)

m a s t e r c a m x g e t t i n g s t a r t e d t u t o r i a l s Be sure you have the latest information! Information might have been changed or added since this document was published. Contact your local Reseller for the latest information. Basic 3D Machining October 2010

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
