---
name: pdf-extract-inventorcam2024-3d-hsm-user-guide
description: Milling order-of-operations PDF extract (stub) — InventorCAM2024_3D_HSM_User_Guide
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:01.996Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_3D_HSM_User_Guide.pdf
  pages_extracted: 60
---

# InventorCAM2024_3D_HSM_User_Guide

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_3D_HSM_User_Guide.pdf` — pages 1..60.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 1.1 	Start HSM Operation
- 1.2 	HSM Operation Overview
- 1.3 	Parameters and Values
- 2.1 	Constant Z Machining
- 2.2 	Hybrid Constant Z
- 2.3 	Helical Machining
- 2.4 	Horizontal Machining
- 2.5 	Linear Machining
- 2.6 	Radial Machining
- 2.7 	Spiral Machining
- 2.8 	Morphed Machining
- 2.9 	Offset Cutting
- 2.10 Boundary Machining
- 2.11 Rest Machining
- 2.12 Contour Rest Machining
- 2.13 3D Constant Step Over Machining
- 2.14 Pencil Milling
- 2.15 Parallel Pencil Milling
- 2.16 3D Corner Offset
- 2.17 Prismatic Part Machining

## First paragraph (sample)

HSM Machining User Guide | InventorCAM 2024 iMachining 2D iMachining 3D 2.5D Milling Indexial Multi-Sided HSS Machining 3D High Speed Milling Simultaneous 5-Axis Turning Advanced Mill-Turn Swiss-Type Solid Probe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
