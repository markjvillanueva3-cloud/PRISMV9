---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cast-002
title: Casting tolerance comparison: sand vs investment vs die
category: quality
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:mit2008-casting@quality-comparison
created_at: 2026-03-03
usage_count: 0
tags: ["casting", "tolerance", "sand-casting", "investment-casting", "die-casting", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: a01234f2a587a4022f8cc5338eba202b7bc06262abdfd914cb5723a958a6667e
mirror_ts: 2026-05-05T13:36:02.147Z
mirror_engine: TribalVaultPopulatorEngine
---

# Casting tolerance comparison: sand vs investment vs die

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mit2008-casting@quality-comparison`

## Tip

Achievable casting tolerances vary dramatically by process. Sand casting: 0.7-2mm (roughest). Investment casting: 0.08-0.2mm (good for complex shapes). Die casting: 0.02-0.6mm (best for production). When designing cast parts that need CNC finishing, plan machining allowances based on casting process tolerance. Investment castings may need minimal finish machining; sand castings need significant stock removal.

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-dl-dfm-001|DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm]] _(category+op:1+tag:2)_
- [[tk-dl-hm-097|Shape continuities analysis for edge quality]] _(category+op:1+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+op:1+tag:1)_
- [[tk-dl-post-010|G51 scaling with probe feedback: sub-micron bore accuracy (Renishaw RAMTIC)]] _(category+op:1+tag:1)_
- [[nx-113|In-Process Dimensional Verification with Adaptive Control]] _(category+op:1+tag:1)_

## Tags

#casting #tolerance #sand-casting #investment-casting #die-casting #operation-finishing
