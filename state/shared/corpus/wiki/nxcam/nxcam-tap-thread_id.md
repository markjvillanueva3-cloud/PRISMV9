---
name: nxcam-tap-thread_id
description: nxcam CAM template for tap (native: Thread ID (THREAD Internal))
metadata:
  type: cam-template
  op: tap
  system: nxcam
  nativeKey: thread_id
---
## Purpose

The **tap** operation in **nxcam** — exposed natively as "Thread ID (THREAD Internal)" (catalog key `thread_id`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry.thread_curve` | [object Object] |
| `geometry.min_pitch_diameter_mm` | [object Object] |
| `tool.tool_id` | [object Object] |
| `tool.boring_bar_overhang_mm` | [object Object] |
| `thread_data.thread_standard` | [object Object] |
| `thread_data.minor_diameter_mm` | [object Object] |
| `thread_data.pitch_mm` | [object Object] |
| `thread_data.length_mm` | [object Object] |
| `thread_data.hand` | [object Object] |
| `infeed.method` | [object Object] |
| `infeed.infeed_angle_deg` | [object Object] |
| `passes.depth_of_thread_mm` | [object Object] |
| `passes.first_pass_doc_mm` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Thread ID (THREAD Internal)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `tap`
- CAM system: `nxcam`
- Native catalog key: `thread_id`
- Parameter count: 13

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
