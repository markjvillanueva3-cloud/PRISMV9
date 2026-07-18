---
name: pdf-extract-sgs-global-catalog-v26-1
description: Milling order-of-operations PDF extract (stub) — SGS_Global_Catalog_v26.1
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:08:05.376Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/SGS_Global_Catalog_v26.1.pdf
  pages_extracted: 14
---

# SGS_Global_Catalog_v26.1

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/SGS_Global_Catalog_v26.1.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- VALUE AT THE SPINDLE
- OVERVIEW
- MILLING
- HOLE MAKING
- ROUTING
- TECHNICAL INFORMATION
- 150 Marc Drive
- 1832 W. Collins Ave.
- 10 Ashville Way
- OPTIMIZE TOOL PERFORMANCE
- SAVE TIME
- COMPARE AND CUSTOMIZE
- EXPORT AND SHARE
- INTELLECTUAL PROPERTY
- PROPIEDAD INTELECTUAL
- GEISTIGES EIGENTUM
- REGULATION SAFETY GLASSES SHOULD ALWAYS BE WORN WHEN
- USING HIGH-SPEED CUTTING EQUIPMENT
- DEBEN USARSE GAFAS PROTECTORAS CUANDO SE UTILICEN EQUIPOS
- DE ALTA VELOCIDAD

## First paragraph (sample)

1 Global Product Catalog Solid Carbide Tools VALUE AT THE SPINDLE www.kyocera-sgstool.com v26.1

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
