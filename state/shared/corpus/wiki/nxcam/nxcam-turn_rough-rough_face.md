---
name: nxcam-turn_rough-rough_face
description: nxcam CAM template for turn_rough (native: Rough Face (ROUGH_FACE))
metadata:
  type: cam-template
  op: turn_rough
  system: nxcam
  nativeKey: rough_face
---
## Purpose

The **turn_rough** operation in **nxcam** — exposed natively as "Rough Face (ROUGH_FACE)" (catalog key `rough_face`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.face_profile` | [object Object] |
| `geometry.outer_diameter_mm` | [object Object] |
| `geometry.inner_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `strategy.direction` | [object Object] |
| `strategy.doc_mm` | [object Object] |
| `strategy.stock_axial_mm` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Rough Face (ROUGH_FACE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `nxcam`
- Native catalog key: `rough_face`
- Parameter count: 10

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
