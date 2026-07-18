---
name: nxcam-turn_rough-rough_turn_od
description: nxcam CAM template for turn_rough (native: Rough Turn OD (ROUGH_TURN_OD))
metadata:
  type: cam-template
  op: turn_rough
  system: nxcam
  nativeKey: rough_turn_od
---
## Purpose

The **turn_rough** operation in **nxcam** — exposed natively as "Rough Turn OD (ROUGH_TURN_OD)" (catalog key `rough_turn_od`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_profile` | [object Object] |
| `geometry.blank_profile` | [object Object] |
| `geometry.machining_side` | [object Object] |
| `geometry.spindle_orientation` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.insert_shape` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `tool.orient_angle_deg` | [object Object] |
| `strategy.cut_pattern` | [object Object] |
| `strategy.direction` | [object Object] |
| `strategy.step_over_mm` | [object Object] |
| `levels.z_start_mm` | [object Object] |
| `levels.z_end_mm` | [object Object] |
| `levels.stock_part_axial_mm` | [object Object] |
| `levels.stock_part_radial_mm` | [object Object] |
| `non_cutting_moves.engage_distance_mm` | [object Object] |
| `non_cutting_moves.retract_distance_mm` | [object Object] |
| `non_cutting_moves.engage_type` | [object Object] |
| `speeds_feeds.spindle_mode` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.spindle_max_rpm` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |
| `corners.corner_cleanup_pass` | [object Object] |
| `corners.corner_radius_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Rough Turn OD (ROUGH_TURN_OD)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `nxcam`
- Native catalog key: `rough_turn_od`
- Parameter count: 24

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
