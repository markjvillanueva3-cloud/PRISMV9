---
name: nxcam-pocket_2d-cavity_mill
description: nxcam CAM template for pocket_2d (native: Cavity Mill (CAVITY_MILL))
metadata:
  type: cam-template
  op: pocket_2d
  system: nxcam
  nativeKey: cavity_mill
---
## Purpose

The **pocket_2d** operation in **nxcam** — exposed natively as "Cavity Mill (CAVITY_MILL)" (catalog key `cavity_mill`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.blank_geometry` | [object Object] |
| `geometry.check_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `tool.tool_corner_radius_mm` | [object Object] |
| `path_settings.cut_pattern` | [object Object] |
| `path_settings.stepover_pct` | [object Object] |
| `path_settings.global_depth_per_cut_mm` | [object Object] |
| `path_settings.part_stock_mm` | [object Object] |
| `cut_levels.level_distribution` | [object Object] |
| `cut_levels.min_depth_per_cut_mm` | [object Object] |
| `non_cutting_moves.engage_type` | [object Object] |
| `non_cutting_moves.helix_diameter_pct` | [object Object] |
| `non_cutting_moves.ramp_angle_deg` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |
| `speeds_feeds.engage_feed_pct` | [object Object] |
| `containment.trim_by_blank` | [object Object] |
| `containment.in_process_workpiece` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Cavity Mill (CAVITY_MILL)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `nxcam`
- Native catalog key: `cavity_mill`
- Parameter count: 20

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
