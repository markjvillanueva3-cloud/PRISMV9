---
name: pdf-extract-inventorcam2024-multiaxis-roughing-pt1
description: Milling order-of-operations PDF extract (stub) — InventorCAM2024_Multiaxis_Roughing_Pt1
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:00.363Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_Multiaxis_Roughing_Pt1.pdf
  pages_extracted: 39
---

# InventorCAM2024_Multiaxis_Roughing_Pt1

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_Multiaxis_Roughing_Pt1.pdf` — pages 1..39.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- Part definition.
- section of the Model dialog box.

## First paragraph (sample)

Application Tutorial | InventorCAM 2024 Multiaxis Machining | Part 1 iMachining 2D iMachining 3D 2.5D Milling Indexial Multi-Sided HSS Machining 3D High Speed Milling Simultaneous 5-Axis Turning Advanced Mill-Turn Swiss-Type Solid Probe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
