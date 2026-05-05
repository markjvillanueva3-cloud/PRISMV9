---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-016
title: JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety
category: quality
domain: process_engineering
knowledge_type: tip
confidence: 90
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "quality-score", "program-review", "completeness", "correctness", "optimization", "safety", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 8519818e4835adb09241c977bdb0b6129512b5725716a10992c797b5158c3621
mirror_ts: 2026-05-05T13:36:01.800Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety

**Category:** `quality` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `jm_die_production_analysis`

## Tip

JM Die WEDM programs are scored 0-100 across 4 factors: (1) Completeness (25%): required codes present — startup sequence, E-codes, H-registers, shutdown sequence. (2) Correctness (25%): proper E-code ordering (rough before skim), offset cascade decreasing, M-code sequence valid. (3) Optimization (30%): parameters match physics benchmarks for material/thickness — feed rates, offsets, pass count appropriate. (4) Safety (20%): proper shutdown, no dangerous sequences, tank fill/drain logic correct. Programs scoring <70% should be reviewed before production. The WEDMBatchProgramAnalyzerEngine computes these scores automatically. Target score for production: >85%.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]] _(category+op:1+tag:3)_
- [[wedm-kb-011|Recast layer thickness determines part integrity]] _(category+op:1+tag:2)_
- [[wedm-kb-019|Taper accuracy: skim passes are critical]] _(category+op:1+tag:2)_
- [[sc2-206|SURFCAM Stock Verification Probing Between Operations]] _(category+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(op:1+tag:3)_

## Tags

#wire-edm #jm-die #quality-score #program-review #completeness #correctness #optimization #safety #operation-roughing
