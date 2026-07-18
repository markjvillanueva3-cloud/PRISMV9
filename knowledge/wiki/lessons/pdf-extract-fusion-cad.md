---
name: pdf-extract-fusion-cad
description: Milling order-of-operations PDF extract (stub) — FUSION CAD
metadata:
  type: lesson
  domain: milling
  topic: order-of-operations
  confidence: 0.3
  needs_curation: true
  extractor: pdf-parse-extract.mjs
  extracted_at: 2026-05-26T20:18:57.966Z
  source_pdf: H:/PRISM/JM DIE/TRIBAL + WIKI/FUSION CAD.pdf
  pages_extracted: 80
---

# FUSION CAD

> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).
> Source: `H:/PRISM/JM DIE/TRIBAL + WIKI/FUSION CAD.pdf` — pages 1..80.
> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.

## Detected structure (top headings)

- DESIGNING 3D MODELS IN FUSION 360
- 079274)
- 2.97 (a)). This line will then be extended to intersect another line in the sketch. As a consequence,

## First paragraph (sample)

We’re on the Web! Visit us at: https://makers-project.eu DESIGNING 3D MODELS IN FUSION 360 Creative Commons licence - Attribution-NonCommercial- ShareAlike CC BY-NC-SA Year of publication: 2022 Editor: Stefan Ivanov Project “MAKER SCHOOLS: Enhancing Student Creativity and STEM Engagement by Integrating 3D Design and Programming into Secondary School Learning” (Agreement no. 2020-1-BG01-KA201- 079274)

## Bridge engines (suggested)

- [[PostProcessorPipelineEngine]]
- [[UltimateSpeedFeedEngine]]
- [[MachineControllerEngine]]

## Next steps

1. Operator reads the PDF section corresponding to each detected heading.
2. Promote OoO-relevant passages to dedicated wiki entries under `knowledge/wiki/code-tribal/`.
3. Bump confidence to ≥0.7 + set `needs_curation: false` once curated.
