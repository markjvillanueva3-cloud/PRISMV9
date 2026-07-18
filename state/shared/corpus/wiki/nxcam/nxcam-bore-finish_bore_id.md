---
name: nxcam-bore-finish_bore_id
description: nxcam CAM template for bore (native: Finish Bore ID (FINISH_BORE))
metadata:
  type: cam-template
  op: bore
  system: nxcam
  nativeKey: finish_bore_id
---
## Purpose

The **bore** operation in **nxcam** — exposed natively as "Finish Bore ID (FINISH_BORE)" (catalog key `finish_bore_id`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_profile` | [object Object] |
| `geometry.min_bore_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.boring_bar_overhang_mm` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `finish_strategy.use_nose_radius_comp` | [object Object] |
| `finish_strategy.spring_pass_count` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |
| `vibration.deflection_target_mm` | [object Object] |
| `vibration.use_damped_bar` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Finish Bore ID (FINISH_BORE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `nxcam`
- Native catalog key: `finish_bore_id`
- Parameter count: 11

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
