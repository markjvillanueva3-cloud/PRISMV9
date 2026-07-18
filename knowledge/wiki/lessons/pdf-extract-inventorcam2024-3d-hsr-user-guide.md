---
name: pdf-extract-inventorcam2024-3d-hsr-user-guide
description: Milling order-of-operations PDF extract (stub) — InventorCAM2024_3D_HSR_User_Guide
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:02.798Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_3D_HSR_User_Guide.pdf
  pages_extracted: 60
---

# InventorCAM2024_3D_HSR_User_Guide

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_3D_HSR_User_Guide.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1.1 	Start HSR Operation
- 1.2 	HSR Operation Overview
- 1.3 	Parameters and Values
- 2.1 	Contour Roughing
- 2.2 	Hatch Roughing
- 2.3 	Hybrid Rib Roughing
- 2.4 	Rest Roughing
- 3.1 	Geometry Definition
- 3.1.1 CoordSys
- 3.1.2 Target geometry
- 3.1.3 Facet tolerance
- 3.1.4 Micro Milling
- 3.1.5 Apply fillets
- 3.1.6 Fillet Surfaces dialog box
- section enables you to specify the geometry parameters of this tool.
- 4.1 	Calculate Minimum Tool Length
- 4.2 	Holder Clearance
- 4.3 	Tool Selection
- 4.4 	Spin & Feed Rate Definition
- 5.1 	Introduction

## First paragraph (sample)

User Guide | InventorCAM 2024 HSR Machining iMachining 2D iMachining 3D 2.5D Milling Indexial Multi-Sided HSS Machining 3D High Speed Milling Simultaneous 5-Axis Turning Advanced Mill-Turn Swiss-Type Solid Probe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
