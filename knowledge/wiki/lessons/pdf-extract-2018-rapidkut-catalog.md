---
name: pdf-extract-2018-rapidkut-catalog
description: Milling order-of-operations PDF extract (stub) — 2018 Rapidkut Catalog
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:53:47.848Z
  source_pdf: H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/2018 Rapidkut Catalog.pdf
  pages_extracted: 80
---

# 2018 Rapidkut Catalog

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/2018 Rapidkut Catalog.pdf` — pages 1..80.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- 48 hours for the following tools:
- 3 in 1 Combo Set (1/16“ - 1/2“
- 13 	1/8“ - 1/2“ by 32nds 	!$( 	278.40
- 26 	A - Z Letter Size 	* 	499.80
- 32 	#1 - #32 	! 	368.20
- 1 	.2280 	2-5/8 	3-7/8 	!! 	2.10
- 2 	.2210 	2-5/8 	3-7/8 	!( 	2.10
- 3 	.2130 	2-1/2 	3-3/4 	!& 	1.95
- 4 	.2090 	2-1/2 	3-3/4 	!% 	1.95
- 5 	.2055 	2-1/2 	3-3/4 	! 	1.95
- 6 	.2040 	2-1/2 	3-3/4 	!$ 	1.95
- 7 	.2010 	2-7/16 	3-5/8 	!5 	1.70
- 8 	.1990 	2-7/16 	3-5/8 	!3 	1.70
- 9 	.1960 	2-7/16 	3-5/8 	!Q 	1.70
- 10 	.1935 	2-7/16 	3-5/8 	!! 	1.85
- 11 	.1910 	2-5/16 	3-1/2 	!!! 	1.80
- 12 	.1890 	2-5/16 	3-1/2 	!!( 	1.80
- 13 	.1850 	2-5/16 	3-1/2 	!!& 	1.80
- 14 	.1820 	2-3/16 	3-3/8 	!!% 	1.80
- 15 	.1800 	2-3/16 	3-3/8 	!! 	1.80

## First paragraph (sample)

                            why we offer custom tooling solutions. By examining your manufacturing process, we can create the right tool for you. Regardless if the tool is off-the-shelf, a standard tool with a slight alteration, or a completely new tool designed for your application, we have a tooling solution for your application.         !           "     !          tools and operat

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
