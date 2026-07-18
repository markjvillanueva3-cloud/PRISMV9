---
name: nxcam-morph_5axis-variable_streamline
description: nxcam CAM template for morph_5axis (native: Variable Streamline (VARIABLE_STREAMLINE))
metadata:
  type: cam-template
  op: morph_5axis
  system: nxcam
  nativeKey: variable_streamline
---
## Purpose

The **morph_5axis** operation in **nxcam** — exposed natively as "Variable Streamline (VARIABLE_STREAMLINE)" (catalog key `variable_streamline`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.stream_curves_u` | [object Object] |
| `geometry.stream_curves_v` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `streamline.u_passes` | [object Object] |
| `streamline.v_passes` | [object Object] |
| `streamline.interpolation` | [object Object] |
| `tool_axis.axis_mode` | [object Object] |
| `tool_axis.lead_angle_deg` | [object Object] |
| `tilt_control.max_tilt_deg` | [object Object] |
| `tilt_control.smoothing` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Variable Streamline (VARIABLE_STREAMLINE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `morph_5axis`
- CAM system: `nxcam`
- Native catalog key: `variable_streamline`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
