---
name: pdf-extract-inventorcam2024-edge-breaking
description: Milling order-of-operations PDF extract (stub) — InventorCAM2024_Edge_Breaking
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:15:04.975Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_Edge_Breaking.pdf
  pages_extracted: 29
---

# InventorCAM2024_Edge_Breaking

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_Edge_Breaking.pdf` — pages 1..29.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- Part definition.

## First paragraph (sample)

Application Tutorial | InventorCAM 2024 Edge Breaking iMachining 2D iMachining 3D 2.5D Milling Indexial Multi-Sided HSS Machining 3D High Speed Milling Simultaneous 5-Axis Turning Advanced Mill-Turn Swiss-Type Solid Probe

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
