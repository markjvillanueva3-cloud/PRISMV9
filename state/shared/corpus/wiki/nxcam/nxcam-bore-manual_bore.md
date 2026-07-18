---
name: nxcam-bore-manual_bore
description: nxcam CAM template for bore (native: Manual Bore (BORE_MANUAL))
metadata:
  type: cam-template
  op: bore
  system: nxcam
  nativeKey: manual_bore
---
## Purpose

The **bore** operation in **nxcam** — exposed natively as "Manual Bore (BORE_MANUAL)" (catalog key `manual_bore`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.z_start_mm` | [object Object] |
| `geometry.z_end_mm` | [object Object] |
| `geometry.bore_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.nose_radius_mm` | [object Object] |
| `motion.retract_mode` | [object Object] |
| `motion.dwell_at_bottom_sec` | [object Object] |
| `motion.retract_clearance_mm` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Manual Bore (BORE_MANUAL)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `nxcam`
- Native catalog key: `manual_bore`
- Parameter count: 10

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
