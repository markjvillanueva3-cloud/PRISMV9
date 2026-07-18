---
name: pdf-extract-threading-2018-1
description: Milling order-of-operations PDF extract (stub) — Threading 2018.1
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T03:59:47.780Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/Threading 2018.1.pdf
  pages_extracted: 14
---

# Threading 2018.1

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/Threading 2018.1.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- CATALOG &
- TECHNICAL
- GUIDE 2018
- THREADING
- SOLUTIONS & SUPPORT
- 335.14 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 155
- 11NR/L
- 16ER/L
- 16NR/L
- 22ER/L
- 22NR/L
- 27ER/L
- 20 = 20 mm
- 25 = 25mm
- 00 = Round toolholders S & C
- 25 = 25 mm
- 32 = 32 mm
- 0,70 1,50 4,00 8,00
- 0,75 1,75 4,50 10,0
- 0,80 2,00 5,00 12,0

## First paragraph (sample)

SOLUTIONS & SUPPORT By choosing Seco, you get more than just a comprehen- sive portfolio of advanced metal-cutting solutions and expert services. You get a partnership based on trust, respect and communication and a team that is always ready to help you gain the competitive advantage. Globally headquartered in Fagersta, Sweden and present in more than 50 countries, Seco develops cutting tools, processes and services for high productivity and profitability. Our team of over 4,000 dedicated employees maintains partnerships around the world to identify and overcome the challenges faced by today’s

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
