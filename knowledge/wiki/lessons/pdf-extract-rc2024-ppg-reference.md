---
name: pdf-extract-rc2024-ppg-reference
description: Milling order-of-operations PDF extract (stub) — RC2024-PPG-Reference
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T19:58:32.000Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/RC2024-PPG-Reference.pdf
  pages_extracted: 60
---

# RC2024-PPG-Reference

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/RC2024-PPG-Reference.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2	Contents
- 2024 RhinoCAM Resource Guide
- 18 Pages
- X: -4, Y: 0 Z: 0
- N72 T1 M06
- S18000
- 5.1 	Dialogs
- 5.1.1 Post Processor File Browser
- 5.1.2 PPG Editor
- 5.1.3 Variable List Dialog
- 5.2 	PPG Editor
- 5.2.1 General
- S1000M03
- S2000M03
- 5.2.2 StartEnd
- 5.2.3 Tool Change
- N1G40G49G80
- 5.2.4 Setup
- 5.2.5 Spindle
- 5.2.6 Feed Rate

## First paragraph (sample)

Post-Process (PPG) Reference Guide Published: May 2024 RhinoCAM-PPG 2024 MecSoft Corpotation © Copyright 1998-2024

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
