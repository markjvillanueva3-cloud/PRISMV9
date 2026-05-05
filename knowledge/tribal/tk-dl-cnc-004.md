---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-004
title: Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm
category: design
domain: document_learned
knowledge_type: heuristic
confidence: 92
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "tolerance", "precision", "cost", "grinding", "operation:grinding"]
material_groups: []
operation_types: ["grinding"]
content_hash: b278dcf18bd1227a0766f649b6646f790147e73997650aa28578680785f4995c
mirror_ts: 2026-05-05T13:36:01.057Z
mirror_engine: TribalVaultPopulatorEngine
---

# Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

Standard CNC machining tolerance is ±0.125mm (±0.005"). Tighter tolerances increase cost significantly: ±0.050mm needs careful setup, ±0.025mm is the feasible limit for standard CNC (grinding/lapping needed below this). Each halving of tolerance roughly doubles machining cost.

## Applies to

- Operation types: `grinding`

## Related tips

- [[tk-dl-cnc-017|Small features below 2.5mm require micro-machining — cost jumps significantly]] _(category+tag:2)_
- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+tag:1)_
- [[tk-dl-cnc-002|Cavity depth limit: 4× width recommended, 10× tool diameter max]] _(category+tag:1)_
- [[tk-dl-dfm-001|DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm]] _(op:1+tag:3)_
- [[tk-dl-cnc-003|Thread sizing: M6+ recommended, max engagement 3× nominal]] _(category+tag:1)_

## Tags

#dfm #tolerance #precision #cost #grinding #operation-grinding
