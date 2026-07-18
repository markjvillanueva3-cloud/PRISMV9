---
name: nxcam-face-face_milling
description: nxcam CAM template for face (native: Face Milling (FACE_MILLING))
metadata:
  type: cam-template
  op: face
  system: nxcam
  nativeKey: face_milling
---
## Purpose

The **face** operation in **nxcam** — exposed natively as "Face Milling (FACE_MILLING)" (catalog key `face_milling`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.blank_geometry` | [object Object] |
| `geometry.part_geometry` | [object Object] |
| `geometry.trim_boundary` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `tool.tool_corner_radius_mm` | [object Object] |
| `tool.tool_holder_check` | [object Object] |
| `tool_axis.axis_mode` | [object Object] |
| `path_settings.cut_pattern` | [object Object] |
| `path_settings.stepover_pct` | [object Object] |
| `path_settings.depth_per_cut_mm` | [object Object] |
| `path_settings.blank_distance_mm` | [object Object] |
| `path_settings.final_floor_stock_mm` | [object Object] |
| `path_settings.wall_stock_mm` | [object Object] |
| `non_cutting_moves.engage_type` | [object Object] |
| `non_cutting_moves.retract_type` | [object Object] |
| `non_cutting_moves.transfer_clearance_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |
| `speeds_feeds.engage_feed_pct` | [object Object] |
| `speeds_feeds.retract_feed_pct` | [object Object] |
| `machine_control.coolant_mode` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Face Milling (FACE_MILLING)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `nxcam`
- Native catalog key: `face_milling`
- Parameter count: 22

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
