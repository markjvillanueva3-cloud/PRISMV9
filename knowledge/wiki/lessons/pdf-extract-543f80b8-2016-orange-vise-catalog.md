---
name: pdf-extract-543f80b8-2016-orange-vise-catalog
description: Milling order-of-operations PDF extract (stub) — 543f80b8_2016_orange_vise_catalog
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:53:51.044Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/543f80b8_2016_orange_vise_catalog.pdf
  pages_extracted: 10
---

# 543f80b8_2016_orange_vise_catalog

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/543f80b8_2016_orange_vise_catalog.pdf` — pages 1..10.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 2016 Catalog
- IN AMERICA
- FREQUENTLY ASKED QUESTIONS
- SUBPLATES (BELOW)
- CARVESMART INTEGRATION
- SINGLE STATION CONVERSION
- EXAMPLE CONFIGURATIONS
- ADDITIONAL CONFIGURATIONS
- VISE PALLETS (FIXTURE PLATES)
- EXTRA WIDE MACHINABLE JAWS
- CONSUMABLE AVAILABILITY
- HORIZONTAL APPLICATIONS
- VERTICAL APPLICATIONS
- 1.88 	B
- OV45-200DS3
- OV6-175DS3
- OV45-175DS3
- OV6-160DS3
- OV45-160DS3
- OV45-160SS3

## First paragraph (sample)

2 O R A N G E V I S E . C O M 100% MADE IN AMERICA Our products are designed and built from the ground up to achieve the ideal balance of performance and convenience. Every product we sell is enitrely made in the USA. Our vises are covered by a lifetime warranty against defects in materials and craftsmanship. Orange Vises are thoroughly engineered to deliver maximum clamping force and repeatability with quick-change features throughout. 3 O R A N G E V I S E . C O M Our dual station vises, available in 6” and 4.5” widths, as well as 20”, 17.5”, and 16.0” lengths, are the most versatile, no-com

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
