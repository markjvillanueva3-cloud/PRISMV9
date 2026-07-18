---
name: nxcam-parallel_finish-fixed_contour
description: nxcam CAM template for parallel_finish (native: Fixed Contour (FIXED_CONTOUR))
metadata:
  type: cam-template
  op: parallel_finish
  system: nxcam
  nativeKey: fixed_contour
---
## Purpose

The **parallel_finish** operation in **nxcam** — exposed natively as "Fixed Contour (FIXED_CONTOUR)" (catalog key `fixed_contour`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.drive_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `drive_method.method` | [object Object] |
| `drive_method.stepover_mm` | [object Object] |
| `drive_method.scallop_height_mm` | [object Object] |
| `projection.projection_vector` | [object Object] |
| `projection.tolerance_mm` | [object Object] |
| `path_settings.cut_direction` | [object Object] |
| `path_settings.wall_stock_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Fixed Contour (FIXED_CONTOUR)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `parallel_finish`
- CAM system: `nxcam`
- Native catalog key: `fixed_contour`
- Parameter count: 13

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
