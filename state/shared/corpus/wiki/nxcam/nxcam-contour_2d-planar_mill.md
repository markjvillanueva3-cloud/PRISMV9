---
name: nxcam-contour_2d-planar_mill
description: nxcam CAM template for contour_2d (native: Planar Mill (PLANAR_MILL))
metadata:
  type: cam-template
  op: contour_2d
  system: nxcam
  nativeKey: planar_mill
---
## Purpose

The **contour_2d** operation in **nxcam** — exposed natively as "Planar Mill (PLANAR_MILL)" (catalog key `planar_mill`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_boundary` | [object Object] |
| `geometry.blank_boundary` | [object Object] |
| `geometry.check_boundary` | [object Object] |
| `geometry.trim_boundary` | [object Object] |
| `geometry.floor_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `path_settings.cut_pattern` | [object Object] |
| `path_settings.stepover_type` | [object Object] |
| `path_settings.stepover_pct` | [object Object] |
| `path_settings.wall_stock_mm` | [object Object] |
| `path_settings.floor_stock_mm` | [object Object] |
| `cut_levels.common_depth_mm` | [object Object] |
| `cut_levels.minimum_cut_length_mm` | [object Object] |
| `cut_levels.use_island_levels` | [object Object] |
| `non_cutting_moves.engage_type` | [object Object] |
| `non_cutting_moves.ramp_angle_deg` | [object Object] |
| `non_cutting_moves.transfer_method` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Planar Mill (PLANAR_MILL)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_2d`
- CAM system: `nxcam`
- Native catalog key: `planar_mill`
- Parameter count: 20

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
