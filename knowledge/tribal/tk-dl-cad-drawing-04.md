---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-04
title: Use baseline dimensioning for critical tolerance features
category: quality
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:cad_drawing_standards@section3
created_at: 2026-03-01
usage_count: 0
tags: ["baseline-dimensioning", "tolerance-stack", "datum", "chain-dimensioning"]
material_groups: []
operation_types: []
content_hash: ec30c528685478e3290a0e27e72b29d0bd4d2085fbb6759622c22b7b3f486e81
mirror_ts: 2026-05-05T13:36:01.430Z
mirror_engine: TribalVaultPopulatorEngine
---

# Use baseline dimensioning for critical tolerance features

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cad_drawing_standards@section3`

## Tip

For features where cumulative tolerance stack-up is unacceptable, use baseline (datum) dimensioning — all dimensions originate from a single reference. Chain dimensioning accumulates tolerances: N dimensions at ±0.1mm gives ±(N×0.1)mm at the end. Baseline dimensioning keeps each feature at ±0.1mm from the datum regardless of chain length.

## Related tips

- [[tk-010|Deburring sequence matters]] _(category+tag:1)_
- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:1)_
- [[tk-dl-cad-drawing-13|Form tolerances (flatness, cylindricity) need no datum]] _(category+tag:1)_
- [[nx-110|On-Machine Probing with Automatic WCS Alignment]] _(category+tag:1)_

## Tags

#baseline-dimensioning #tolerance-stack #datum #chain-dimensioning
