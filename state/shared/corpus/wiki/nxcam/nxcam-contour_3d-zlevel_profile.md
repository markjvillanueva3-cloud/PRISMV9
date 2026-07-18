---
name: nxcam-contour_3d-zlevel_profile
description: nxcam CAM template for contour_3d (native: Z-Level Profile (ZLEVEL_PROFILE))
metadata:
  type: cam-template
  op: contour_3d
  system: nxcam
  nativeKey: zlevel_profile
---
## Purpose

The **contour_3d** operation in **nxcam** — exposed natively as "Z-Level Profile (ZLEVEL_PROFILE)" (catalog key `zlevel_profile`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.trim_boundary` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `steep_containment.steep_angle_deg` | [object Object] |
| `steep_containment.merge_with_shallow_pass` | [object Object] |
| `cut_levels.global_depth_per_cut_mm` | [object Object] |
| `cut_levels.min_depth_per_cut_mm` | [object Object] |
| `cut_levels.merge_distance_mm` | [object Object] |
| `path_settings.cut_direction` | [object Object] |
| `path_settings.spiral_path` | [object Object] |
| `path_settings.wall_stock_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Z-Level Profile (ZLEVEL_PROFILE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_3d`
- CAM system: `nxcam`
- Native catalog key: `zlevel_profile`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
