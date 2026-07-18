---
name: nxcam-trace-teach_mode
description: nxcam CAM template for trace (native: Teach Mode (TEACH_MODE))
metadata:
  type: cam-template
  op: trace
  system: nxcam
  nativeKey: teach_mode
---
## Purpose

The **trace** operation in **nxcam** — exposed natively as "Teach Mode (TEACH_MODE)" (catalog key `teach_mode`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.start_point` | [object Object] |
| `geometry.end_point` | [object Object] |
| `tool.tool_id` | [object Object] |
| `teach_sequence.taught_point_count` | [object Object] |
| `teach_sequence.allow_feed_between_each` | [object Object] |
| `teach_sequence.allow_rapid_between_each` | [object Object] |
| `speeds_feeds.default_feed_mm_per_rev` | [object Object] |
| `speeds_feeds.rapid_override_pct` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Teach Mode (TEACH_MODE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `trace`
- CAM system: `nxcam`
- Native catalog key: `teach_mode`
- Parameter count: 8

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
