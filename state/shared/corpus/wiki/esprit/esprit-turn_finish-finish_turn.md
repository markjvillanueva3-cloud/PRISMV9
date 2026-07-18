---
name: esprit-turn_finish-finish_turn
description: esprit CAM template for turn_finish (native: finish turn)
metadata:
  type: cam-template
  op: turn_finish
  system: esprit
  nativeKey: finish_turn
---
## Purpose

The **turn_finish** operation in **esprit** — exposed natively as "finish turn" (catalog key `finish_turn`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `profile` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "finish turn". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_finish`
- CAM system: `esprit`
- Native catalog key: `finish_turn`
- Parameter count: 2

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
