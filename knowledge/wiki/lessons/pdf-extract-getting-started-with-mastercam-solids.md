---
name: pdf-extract-getting-started-with-mastercam-solids
description: Milling order-of-operations PDF extract (stub) — Getting Started with Mastercam Solids
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:20.306Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/Getting Started with Mastercam Solids.pdf
  pages_extracted: 50
---

# Getting Started with Mastercam Solids

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/Getting Started with Mastercam Solids.pdf` — pages 1..50.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2 MASTERCAM X8/ Introduction
- GETTING STARTED WITH MASTERCAM SOLIDS
- LESSON 1
- 1 	Start Mastercam using your
- 2 	Select the default metric configuration file:
- 4 MASTERCAM X8/ Introduction to Mastercam Solids
- 1 	Open the file MarkerTray.
- 2 	So you do not overwrite the original, save the file as MarkerTray-XXX, where
- 3 	From Mastercam’s menu, choose
- CREATING THE TRAY BASE 5
- 4 	Chain the outer rectangle, as shown
- 5 	Click OK in the Chaining dialog box.
- 6 	In the function panel, click the
- 6 MASTERCAM X8/ Introduction to Mastercam Solids
- 7 	Set the extrude distance to 2mm,
- 8 	Click OK and Create New
- 9 	Chain the inside rectangle, and click
- CREATING THE TRAY BASE 7
- 10 	Reverse the extrude direction, and
- 11 	Set the solids operation to Add

## First paragraph (sample)

Mastercam® X8 Solids Getting Started Date: July 2014 Copyright © 2014 CNC Software, Inc.— All rights reserved. Software: Mastercam X8 TERMS OF USE Use of this document is subject to the Mastercam End User License Agreement. A copy of the Mastercam End User License Agreement is included with the Mastercam product package of which this document is part. The Mastercam End User License Agreement can also be found at: http://www.mastercam.com/companyinfo/legal/LicenseAgreement.aspx Be sure you have the latest information! Information might have been changed or added since this document was publishe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
