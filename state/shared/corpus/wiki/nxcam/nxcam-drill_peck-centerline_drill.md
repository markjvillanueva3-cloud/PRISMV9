---
name: nxcam-drill_peck-centerline_drill
description: nxcam CAM template for drill_peck (native: Centerline Drilling (CENTERLINE_DRILL))
metadata:
  type: cam-template
  op: drill_peck
  system: nxcam
  nativeKey: centerline_drill
---
## Purpose

The **drill_peck** operation in **nxcam** — exposed natively as "Centerline Drilling (CENTERLINE_DRILL)" (catalog key `centerline_drill`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.z_start_mm` | [object Object] |
| `geometry.z_depth_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.drill_diameter_mm` | [object Object] |
| `tool.point_angle_deg` | [object Object] |
| `tool.tip_compensation` | [object Object] |
| `peck_strategy.cycle` | [object Object] |
| `peck_strategy.peck_depth_mm` | [object Object] |
| `peck_strategy.retract_clearance_mm` | [object Object] |
| `speeds_feeds.rpm` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |
| `speeds_feeds.use_css` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Centerline Drilling (CENTERLINE_DRILL)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `nxcam`
- Native catalog key: `centerline_drill`
- Parameter count: 12

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
