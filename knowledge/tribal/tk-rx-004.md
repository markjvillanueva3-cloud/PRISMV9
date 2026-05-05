---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-004
title: Surface finish Ra targets by manufacturing quality level
category: surface_finish
subcategory: roughness
domain: document_learned
knowledge_type: heuristic
confidence: 92
source: document:Fusion360-Skill-Roadmap@surface-finish-targets
created_at: 2026-03-06
usage_count: 0
tags: ["Ra", "Rz", "roughness", "N-grade", "quality-level", "cost", "finishing", "operation:roughing", "operation:finishing", "operation:grinding"]
material_groups: []
operation_types: ["finishing", "grinding", "polishing"]
content_hash: 6648e60ca73228b93a7de4fb5afea39c662a2e5abb6ffcbec245820163988e48
mirror_ts: 2026-05-05T13:36:01.070Z
mirror_engine: TribalVaultPopulatorEngine
---

# Surface finish Ra targets by manufacturing quality level

**Category:** `surface_finish` · **Subcategory:** `roughness` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:Fusion360-Skill-Roadmap@surface-finish-targets`

## Tip

Target surface roughness Ra by quality level: Rough machining: 6.3-12.5 µm (N9-N10, stock removal only). Semi-finish: 1.6-3.2 µm (N7-N8, functional non-critical). General finish: 0.8-1.6 µm (N6-N7, standard tolerance surfaces). Fine finish: 0.4-0.8 µm (N5-N6, bearing surfaces, sealing faces). Polish-ready: 0.2-0.4 µm (N4-N5, requires carbide/CBN, very low feed). Mirror/optical: <0.1 µm (N1-N3, requires grinding/lapping/polishing). Conversion: Ra ≈ Rz/4 (approximate). Cost multiplier per step down: roughly 1.5-2× (each halving of Ra doubles machining time).

## Applies to

- Operation types: `finishing`, `grinding`, `polishing`

## Related tips

- [[tk-rx-013|Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement]] _(category+op:1+tag:3)_
- [[pm-013|Raster Finishing Angle Optimization for Surface Quality]] _(category+op:1+tag:2)_
- [[tk-dl-hm-005|Z Level Finishing adapts stepdown to surface steepness]] _(category+op:1+tag:2)_
- [[tk-dl-hm-006|Equidistant Finishing for best HSM surface quality]] _(category+op:1+tag:2)_
- [[tk-rx-009|Steep/shallow boundary angle: use 45° default, overlap ±5° to prevent witness lines]] _(category+op:1+tag:2)_

## Tags

#ra #rz #roughness #n-grade #quality-level #cost #finishing #operation-roughing #operation-finishing #operation-grinding
