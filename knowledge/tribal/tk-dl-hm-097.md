---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-097
title: Shape continuities analysis for edge quality
category: quality
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:hypercad-s-v33@p182
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "continuity", "edge-analysis", "surface-quality", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: d051c91423fcd04212eb940bf729571dc3b9d35c564844fa221e41fae23faf55
mirror_ts: 2026-05-05T13:36:01.451Z
mirror_engine: TribalVaultPopulatorEngine
---

# Shape continuities analysis for edge quality

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypercad-s-v33@p182`

## Tip

Use Analysis → Shape continuities (v2023.2+) to examine edge transitions: Gaps, Sharp edges, Tangent continuous (G1), and Curvature continuous (G2). Enable 'Create curves' to generate persistent boundary curves colored by type. Use to identify problem edges for finishing strategies and to plan where rest-material passes are needed.

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-dl-dfm-001|DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm]] _(category+op:1+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+op:1+tag:1)_
- [[tk-dl-cast-002|Casting tolerance comparison: sand vs investment vs die]] _(category+op:1+tag:1)_
- [[tk-dl-post-010|G51 scaling with probe feedback: sub-micron bore accuracy (Renishaw RAMTIC)]] _(category+op:1+tag:1)_
- [[nx-113|In-Process Dimensional Verification with Adaptive Control]] _(category+op:1+tag:1)_

## Tags

#hypermill #hypercad-s #continuity #edge-analysis #surface-quality #operation-finishing
