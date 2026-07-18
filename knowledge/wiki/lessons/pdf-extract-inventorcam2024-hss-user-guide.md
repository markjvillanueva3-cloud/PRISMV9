---
name: pdf-extract-inventorcam2024-hss-user-guide
description: Milling order-of-operations PDF extract (stub) — InventorCAM2024_HSS_User_Guide
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:17:58.792Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_HSS_User_Guide.pdf
  pages_extracted: 60
---

# InventorCAM2024_HSS_User_Guide

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_HSS_User_Guide.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1.1 Adding an HSS Operation
- 1.2 HSS operation dialog box
- 1.3 The stages of the HSS operation parameters definition
- 2.1 CoordSys page
- 3.1 Geometry
- 3.1.1 Geometry for the Parallel cuts strategies
- 3.1.2 Geometry for the Parallel to curves strategy
- 3.1.3 Geometry for the Parallel to surface strategy
- 3.1.4 Geometry for the Morph between two boundary curves strategy
- 3.1.5 Geometry for the Morph between two adjacent surfaces strategy
- 3.1.6 Geometry for the Projection strategies
- 3.2 Area
- 3.2.1 Full, avoid cuts at exact edges
- 3.2.2 Full, start and end at exact surface edges
- 3.2.3 Limit cuts by one or two points
- 3.2.4 Determined by number of cuts
- 3.2.5 Use 2D Boundary
- 1 2 3
- 1 	2 	3 	4
- 4.1 	Tool definition

## First paragraph (sample)

HSS Machining User Guide | InventorCAM 2024 iMachining 2D iMachining 3D 2.5D Milling Indexial Multi-Sided HSS Machining 3D High Speed Milling Simultaneous 5-Axis Turning Advanced Mill-Turn Swiss-Type Solid Probe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
