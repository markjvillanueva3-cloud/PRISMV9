---
name: nxcam-parallel_finish-variable_contour
description: nxcam CAM template for parallel_finish (native: Variable Contour (VARIABLE_CONTOUR))
metadata:
  type: cam-template
  op: parallel_finish
  system: nxcam
  nativeKey: variable_contour
---
## Purpose

The **parallel_finish** operation in **nxcam** — exposed natively as "Variable Contour (VARIABLE_CONTOUR)" (catalog key `variable_contour`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.drive_geometry` | [object Object] |
| `geometry.check_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `drive_method.method` | [object Object] |
| `drive_method.step_method` | [object Object] |
| `tool_axis.axis_mode` | [object Object] |
| `tool_axis.lead_angle_deg` | [object Object] |
| `tool_axis.lag_angle_deg` | [object Object] |
| `tool_axis.tilt_angle_deg` | [object Object] |
| `projection.projection_vector` | [object Object] |
| `tilt_control.max_tilt_deg` | [object Object] |
| `tilt_control.min_tool_axis_change_deg` | [object Object] |
| `tilt_control.smoothing` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Variable Contour (VARIABLE_CONTOUR)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `parallel_finish`
- CAM system: `nxcam`
- Native catalog key: `variable_contour`
- Parameter count: 17

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
