---
name: nxcam-turn_finish-finish_turn_od
description: nxcam CAM template for turn_finish (native: Finish Turn OD (FINISH_TURN))
metadata:
  type: cam-template
  op: turn_finish
  system: nxcam
  nativeKey: finish_turn_od
---
## Purpose

The **turn_finish** operation in **nxcam** — exposed natively as "Finish Turn OD (FINISH_TURN)" (catalog key `finish_turn_od`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_profile` | [object Object] |
| `geometry.machining_side` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `tool.wear_offset_register` | [object Object] |
| `finish_strategy.use_nose_radius_comp` | [object Object] |
| `finish_strategy.spring_pass_count` | [object Object] |
| `finish_strategy.lead_in_type` | [object Object] |
| `finish_strategy.lead_radius_mm` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |
| `feed_control.corner_feed_pct` | [object Object] |
| `feed_control.arc_feed_pct` | [object Object] |
| `feed_control.feed_reduction_distance_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Finish Turn OD (FINISH_TURN)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_finish`
- CAM system: `nxcam`
- Native catalog key: `finish_turn_od`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
