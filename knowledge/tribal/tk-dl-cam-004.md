---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-004
title: 5-axis hierarchy: 3+2 fixed > auto-indexing > simultaneous
category: strategy
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:hypermill-cam-strategies@5axis
created_at: 2026-03-03
usage_count: 0
tags: ["5-axis", "3+2", "indexing", "simultaneous", "hierarchy", "operation:5_axis"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 1617abb4ec90361cdfeb3724e7f46ab06a03360c8cee6863b3b8f316cf9b0330
mirror_ts: 2026-05-05T13:36:01.467Z
mirror_engine: TribalVaultPopulatorEngine
---

# 5-axis hierarchy: 3+2 fixed > auto-indexing > simultaneous

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-cam-strategies@5axis`

## Tip

Prefer simplest 5-axis approach that works: (1) 3+2 fixed position — fastest, most rigid, all machines support it. (2) Automatic indexing — finds collision-free fixed angles per area, minimizes machine movement. (3) Simultaneous 5-axis — only when geometry requires continuous tool orientation change (deep cavities, steep walls, SWARF). Simultaneous increases programming time 3-5× and machine wear.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:1+tag:3)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:1+tag:2)_
- [[tk-dl-swarf-001|SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing]] _(category+op:1+tag:2)_
- [[tk-dl-solidcam-003|Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter]] _(category+op:1+tag:2)_
- [[tk-dl-cam-005|SWARF machining: line contact = fewer passes + better surface]] _(category+op:1+tag:2)_

## Tags

#5-axis #3-2 #indexing #simultaneous #hierarchy #operation-5_axis
