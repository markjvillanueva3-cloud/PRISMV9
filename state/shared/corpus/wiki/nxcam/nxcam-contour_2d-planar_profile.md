---
name: nxcam-contour_2d-planar_profile
description: nxcam CAM template for contour_2d (native: Planar Profile (PLANAR_PROFILE))
metadata:
  type: cam-template
  op: contour_2d
  system: nxcam
  nativeKey: planar_profile
---
## Purpose

The **contour_2d** operation in **nxcam** — exposed natively as "Planar Profile (PLANAR_PROFILE)" (catalog key `planar_profile`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_boundary` | [object Object] |
| `geometry.tool_side` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `path_settings.cut_direction` | [object Object] |
| `path_settings.wall_stock_mm` | [object Object] |
| `path_settings.compensation_register` | [object Object] |
| `path_settings.spring_passes` | [object Object] |
| `non_cutting_moves.engage_type` | [object Object] |
| `non_cutting_moves.engage_radius_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Planar Profile (PLANAR_PROFILE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_2d`
- CAM system: `nxcam`
- Native catalog key: `planar_profile`
- Parameter count: 12

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
