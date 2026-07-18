---
name: pdf-extract-accupro-2013
description: Milling order-of-operations PDF extract (stub) — Accupro 2013
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T04:07:55.789Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/Accupro 2013.pdf
  pages_extracted: 14
---

# Accupro 2013

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/Accupro 2013.pdf` — pages 1..14.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- HIGH PERFORMANCE
- METALWORKING PRODUCTS
- BORING, GROOVING
- HOLEMAKING
- THREADING
- MILLING
- TOOLHOLDING
- PARABOLIC DRILLS
- 1.10 	0.0433 	7 	28 	AU01330950 	$3.85 	AU01347871 	$7.55
- 1.15 	0.0453 	7 	28 	AU01330968 	3.85 	AU01347889 	7.55
- 1.20 	0.0472 	7 	28 	AU01330992 	3.85 	AU01347913 	7.55
- 1.25 	0.0492 	7 	28 	AU01331008 	3.85 	AU01347921 	7.55
- 1.30 	0.0512 	7 	28 	AU01331016 	3.85 	AU01347939 	7.55
- 1.35 	0.0531 	9 	32 	AU01331032 	3.85 	AU01347954 	7.55
- 1.40 	0.0551 	9 	32 	AU01331040 	3.36 	AU01347962 	7.55
- 1.45 	0.0571 	9 	32 	AU01331057 	3.85 	AU01347970 	7.55
- 1.50 	0.0591 	9 	32 	AU01331065 	3.46 	AU01347988 	7.55
- 1.55 	0.0610 	10 	34 	AU01331081 	3.85 	AU01348002 	7.55
- 1.60 	0.0630 	10 	34 	AU01331107 	3.85 	AU01348028 	7.55
- 1.65 	0.0650 	10 	34 	AU01331131 	3.85 	AU01348051 	7.55

## First paragraph (sample)

100% satisfaction guaranteed on all tools. You don’t rest until your customers are happy. Neither do we. If you’re not happy with the durability or reliability of any Accupro premium tool, you have 30 days to return it, hassle free, for your money back. Guaranteed. I am Accuprotected.

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
