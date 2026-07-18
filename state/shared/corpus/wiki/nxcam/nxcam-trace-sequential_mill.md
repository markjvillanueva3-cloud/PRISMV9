---
name: nxcam-trace-sequential_mill
description: nxcam CAM template for trace (native: Sequential Mill (SEQUENTIAL_MILL))
metadata:
  type: cam-template
  op: trace
  system: nxcam
  nativeKey: sequential_mill
---
## Purpose

The **trace** operation in **nxcam** — exposed natively as "Sequential Mill (SEQUENTIAL_MILL)" (catalog key `sequential_mill`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.part_geometry` | [object Object] |
| `geometry.drive_curves` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.tool_diameter_mm` | [object Object] |
| `subop_sequence.subop_count` | [object Object] |
| `subop_sequence.manual_engage_each` | [object Object] |
| `subop_sequence.manual_retract_each` | [object Object] |
| `speeds_feeds.spindle_rpm` | [object Object] |
| `speeds_feeds.cut_feed_mm_per_min` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Sequential Mill (SEQUENTIAL_MILL)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `trace`
- CAM system: `nxcam`
- Native catalog key: `sequential_mill`
- Parameter count: 9

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
