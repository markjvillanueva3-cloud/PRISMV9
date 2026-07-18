---
name: nxcam-swarf_5axis-swarf_drive
description: nxcam CAM template for swarf_5axis (native: Swarf Drive (SWARF_DRIVE))
metadata:
  type: cam-template
  op: swarf_5axis
  system: nxcam
  nativeKey: swarf_drive
---
## Purpose

The **swarf_5axis** operation in **nxcam** — exposed natively as "Swarf Drive (SWARF_DRIVE)" (catalog key `swarf_drive`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.drive_surface` | [object Object] |
| `geometry.check_geometry` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `tool.tool_length_mm` | [object Object] |
| `drive_strategy.drive_method` | [object Object] |
| `drive_strategy.step_method` | [object Object] |
| `drive_strategy.passes` | [object Object] |
| `tool_axis.axis_mode` | [object Object] |
| `tool_axis.tilt_offset_deg` | [object Object] |
| `engagement.side_thickness_mm` | [object Object] |
| `engagement.lift_off_at_end_mm` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Swarf Drive (SWARF_DRIVE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `swarf_5axis`
- CAM system: `nxcam`
- Native catalog key: `swarf_drive`
- Parameter count: 15

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
