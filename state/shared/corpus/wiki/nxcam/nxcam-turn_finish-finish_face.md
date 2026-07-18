---
name: nxcam-turn_finish-finish_face
description: nxcam CAM template for turn_finish (native: Finish Face (FINISH_FACE))
metadata:
  type: cam-template
  op: turn_finish
  system: nxcam
  nativeKey: finish_face
---
## Purpose

The **turn_finish** operation in **nxcam** — exposed natively as "Finish Face (FINISH_FACE)" (catalog key `finish_face`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.face_profile` | [object Object] |
| `geometry.outer_diameter_mm` | [object Object] |
| `geometry.inner_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `finish_strategy.direction` | [object Object] |
| `finish_strategy.use_nose_radius_comp` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Finish Face (FINISH_FACE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_finish`
- CAM system: `nxcam`
- Native catalog key: `finish_face`
- Parameter count: 9

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
