---
name: nxcam-tap-thread_od
description: nxcam CAM template for tap (native: Thread OD (THREAD))
metadata:
  type: cam-template
  op: tap
  system: nxcam
  nativeKey: thread_od
---
## Purpose

The **tap** operation in **nxcam** — exposed natively as "Thread OD (THREAD)" (catalog key `thread_od`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.thread_curve` | [object Object] |
| `geometry.machining_side` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.insert_style` | [object Object] |
| `tool.thread_angle_deg` | [object Object] |
| `thread_data.thread_standard` | [object Object] |
| `thread_data.major_diameter_mm` | [object Object] |
| `thread_data.pitch_mm` | [object Object] |
| `thread_data.length_mm` | [object Object] |
| `thread_data.starts` | [object Object] |
| `thread_data.hand` | [object Object] |
| `infeed.method` | [object Object] |
| `infeed.infeed_angle_deg` | [object Object] |
| `infeed.constant_chip_area` | [object Object] |
| `passes.depth_of_thread_mm` | [object Object] |
| `passes.first_pass_doc_mm` | [object Object] |
| `passes.spring_passes` | [object Object] |
| `speeds_feeds.surface_speed_m_per_min` | [object Object] |
| `speeds_feeds.spindle_mode_override` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Thread OD (THREAD)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `tap`
- CAM system: `nxcam`
- Native catalog key: `thread_od`
- Parameter count: 19

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
