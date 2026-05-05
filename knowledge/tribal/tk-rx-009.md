---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-009
title: Steep/shallow boundary angle: use 45° default, overlap ±5° to prevent witness lines
category: surface_finish
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:Fusion360-Skill-Roadmap@steep-shallow-detection
created_at: 2026-03-06
usage_count: 0
tags: ["steep-shallow", "boundary-angle", "hybrid", "witness-line", "overlap", "finishing", "operation:finishing"]
material_groups: []
operation_types: ["finishing", "3d-milling"]
content_hash: f4e21c945387b75eee60e2bc2035fa26cbd1e9d66874b5532e29297a9e9964d2
mirror_ts: 2026-05-05T13:36:02.169Z
mirror_engine: TribalVaultPopulatorEngine
---

# Steep/shallow boundary angle: use 45° default, overlap ±5° to prevent witness lines

**Category:** `surface_finish` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:Fusion360-Skill-Roadmap@steep-shallow-detection`

## Tip

When using hybrid finishing strategies that combine steep (Z-level) and shallow (planar/scallop) passes, the boundary angle determines where the strategy switches. Default: 45° from horizontal. Overlap zone: ±5° (so Z-level machines 40-90° and planar machines 0-50°). The 10° overlap zone is machined by BOTH strategies, blending the transition. Without overlap: visible witness line at the boundary angle. Too much overlap (>15°): wasted cycle time on double-machining. Some CAM systems auto-detect the optimal angle — verify it matches part geometry. For molds with draft angles, set boundary = draft angle ± 5°.

## Applies to

- Operation types: `finishing`, `3d-milling`

## Related tips

- [[tk-rx-013|Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement]] _(category+op:2+tag:2)_
- [[tk-rx-004|Surface finish Ra targets by manufacturing quality level]] _(category+op:1+tag:2)_
- [[pm-013|Raster Finishing Angle Optimization for Surface Quality]] _(category+op:1+tag:2)_
- [[tk-dl-hm-005|Z Level Finishing adapts stepdown to surface steepness]] _(category+op:1+tag:2)_
- [[tk-dl-hm-006|Equidistant Finishing for best HSM surface quality]] _(category+op:1+tag:2)_

## Tags

#steep-shallow #boundary-angle #hybrid #witness-line #overlap #finishing #operation-finishing
