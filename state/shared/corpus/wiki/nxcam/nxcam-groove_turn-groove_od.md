---
name: nxcam-groove_turn-groove_od
description: nxcam CAM template for groove_turn (native: Groove OD (GROOVE_OD))
metadata:
  type: cam-template
  op: groove_turn
  system: nxcam
  nativeKey: groove_od
---
## Purpose

The **groove_turn** operation in **nxcam** — exposed natively as "Groove OD (GROOVE_OD)" (catalog key `groove_od`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.groove_curve` | [object Object] |
| `geometry.groove_width_mm` | [object Object] |
| `geometry.groove_depth_mm` | [object Object] |
| `geometry.groove_count` | [object Object] |
| `geometry.groove_pitch_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.insert_width_mm` | [object Object] |
| `groove_strategy` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.feed_per_rev_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Groove OD (GROOVE_OD)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `groove_turn`
- CAM system: `nxcam`
- Native catalog key: `groove_od`
- Parameter count: 10

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
