---
name: nxcam-parallel_finish-surface_contour
description: nxcam CAM template for parallel_finish (native: Surface Contour (SURFACE_CONTOUR))
metadata:
  type: cam-template
  op: parallel_finish
  system: nxcam
  nativeKey: surface_contour
---
## Purpose

The **parallel_finish** operation in **nxcam** — exposed natively as "Surface Contour (SURFACE_CONTOUR)" (catalog key `surface_contour`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.drive_surfaces` | [object Object] |
| `geometry.trim_curves` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `tool.tool_corner_radius_mm` | [object Object] |
| `drive_method.method` | [object Object] |
| `drive_method.step_method` | [object Object] |
| `drive_method.scallop_height_mm` | [object Object] |
| `tolerance.intolerance_mm` | [object Object] |
| `tolerance.outtolerance_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Surface Contour (SURFACE_CONTOUR)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `parallel_finish`
- CAM system: `nxcam`
- Native catalog key: `surface_contour`
- Parameter count: 13

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
