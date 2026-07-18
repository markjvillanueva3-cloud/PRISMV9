---
name: esprit-face-live_tool_mill_face
description: esprit CAM template for face (native: live tool mill face)
metadata:
  type: cam-template
  op: face
  system: esprit
  nativeKey: live_tool_mill_face
---
## Purpose

The **face** operation in **esprit** — exposed natively as "live tool mill face" (catalog key `live_tool_mill_face`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `geometry` | _(none)_ |
| `strategy` | _(none)_ |
| `machine` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "live tool mill face". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `esprit`
- Native catalog key: `live_tool_mill_face`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
