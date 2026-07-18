---
name: pdf-extract-introduction-to-wcs
description: Milling order-of-operations PDF extract (stub) — Introduction_to_WCS
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:25:42.199Z
  source_pdf: H:/prism/resources/MasterCam/tutorialx8-wcs-intro/Introduction_to_WCS.pdf
  pages_extracted: 60
---

# Introduction_to_WCS

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MasterCam/tutorialx8-wcs-intro/Introduction_to_WCS.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2 MASTERCAM X8/ Introduction
- INTRODUCTION TO THE WORK COORDINATE SYSTEM (WCS)
- 4 MASTERCAM X8/ Working With Views and Planes
- VIEWS AND PLANES 5
- 6 MASTERCAM X8/ Working With Views and Planes
- LESSON 1
- 8 MASTERCAM X8/ Changing the TPlane vs Changing the WCS
- 1 	Start Mastercam using your
- 2 	Select the default metric configuration file:
- SELECTING THE TPLANE 9
- 3 	Open the part file, BRACE W-VIEW.MCX-8, which was provided with the
- 4 	If necessary, fit the geometry to the screen using [Alt+F1] or the Fit button.
- 5 	Click Planes, Named planes, Plane
- 10 MASTERCAM X8/ Changing the TPlane vs Changing the WCS
- 6 	Select FACE OF PART and click OK.
- 7 	Choose File, Save As, and save the part file under a different file name. This
- 1 	Select 2D High Speed, Dynamic
- 2 	Click OK if prompted to enter a new
- CUTTING THE SLOT 11
- 3 	Click Select under Machining

## First paragraph (sample)

Mastercam® X8 Introduction to WCS Date: July 2014 Copyright © 2014 CNC Software, Inc.— All rights reserved. Software: Mastercam X8 TERMS OF USE Use of this document is subject to the Mastercam End User License Agreement. A copy of the Mastercam End User License Agreement is included with the Mastercam product package of which this document is part. The Mastercam End User License Agreement can also be found at: http://www.mastercam.com/companyinfo/legal/LicenseAgreement.aspx Be sure you have the latest information! Information might have been changed or added since this document was published. 

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
