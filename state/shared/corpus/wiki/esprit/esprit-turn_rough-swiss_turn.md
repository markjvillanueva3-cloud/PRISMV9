---
name: esprit-turn_rough-swiss_turn
description: esprit CAM template for turn_rough (native: swiss turn)
metadata:
  type: cam-template
  op: turn_rough
  system: esprit
  nativeKey: swiss_turn
---
## Purpose

The **turn_rough** operation in **esprit** — exposed natively as "swiss turn" (catalog key `swiss_turn`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `profile` | _(none)_ |
| `bushing` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "swiss turn". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `esprit`
- Native catalog key: `swiss_turn`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
