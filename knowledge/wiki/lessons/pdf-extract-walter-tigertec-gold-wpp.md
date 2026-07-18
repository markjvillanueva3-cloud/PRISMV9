---
name: pdf-extract-walter-tigertec-gold-wpp
description: Lathe turning-programming PDF extract (stub) — walter-tigertec-gold-wpp
metadata:
  type: lesson
  domain: lathe
  topic: turning-programming
  confidence: 0.3
  needs_curation: true
  cross_domain: [milling]
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T18:59:22.591Z
  source_pdf: H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/walter-tigertec-gold-wpp.pdf
  pages_extracted: 14
---

# walter-tigertec-gold-wpp

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/walter-tigertec-gold-wpp.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- WPP10G, WPP20G, WPP30G
- WPP30G
- WPP20G
- WPP10G
- P10 P20 P30
- 0 3 6 9 12 15 18 21 24 27
- WPP10S
- WPP20S WPP20G
- 75 % or Vbmax = 0.35 mm
- 0 COATING 1 GRINDING 2 DRY BLASTING 3 TIGER BLASTING
- PROCESS RELIABILITY
- PERFORMANCE
- FLEXIBILITY
- 3 Colours – 3 Benefits

## First paragraph (sample)

© by Walter AG Tiger·tec® Gold – WPP10G, WPP20G, WPP30G Application Kussmaul | PPT | 01.2022 1 ISO Material Groups: Applications: Additional Information: Main application: • Steel turning i.e., drive shafts, wheels, flanges, … • Martensitic stainless steel • Wet/dry machining, continuous/interrupted Additional application: • Nodular iron (GGG) i.e., differential housings • Grey cast (GG) iron with heavy interruptions • Austenitic stainless steel – roughing Grade P M K N S H O WPP10G ⚫⚫ ⚫ WPP20G ⚫⚫ ⚫ WPP30G ⚫⚫ ⚫ ⚫

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
