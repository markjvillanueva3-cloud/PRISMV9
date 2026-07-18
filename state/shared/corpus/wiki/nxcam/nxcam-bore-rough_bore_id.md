---
name: nxcam-bore-rough_bore_id
description: nxcam CAM template for bore (native: Rough Bore ID (ROUGH_BORE))
metadata:
  type: cam-template
  op: bore
  system: nxcam
  nativeKey: rough_bore_id
---
## Purpose

The **bore** operation in **nxcam** — exposed natively as "Rough Bore ID (ROUGH_BORE)" (catalog key `rough_bore_id`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_profile` | [object Object] |
| `geometry.min_bore_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.boring_bar_diameter_mm` | [object Object] |
| `tool.boring_bar_overhang_mm` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `strategy.cut_pattern` | [object Object] |
| `strategy.step_over_mm` | [object Object] |
| `levels.z_start_mm` | [object Object] |
| `levels.z_end_mm` | [object Object] |
| `levels.stock_part_radial_mm` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.spindle_max_rpm` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |
| `vibration.ld_warn_above` | [object Object] |
| `vibration.use_damped_bar` | [object Object] |
| `vibration.deflection_limit_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Rough Bore ID (ROUGH_BORE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `nxcam`
- Native catalog key: `rough_bore_id`
- Parameter count: 17

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
