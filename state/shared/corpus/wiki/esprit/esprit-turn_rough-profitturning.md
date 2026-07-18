---
name: esprit-turn_rough-profitturning
description: esprit CAM template for turn_rough (native: profitturning)
metadata:
  type: cam-template
  op: turn_rough
  system: esprit
  nativeKey: profitturning
---
## Purpose

The **turn_rough** operation in **esprit** — exposed natively as "profitturning" (catalog key `profitturning`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `profile` | _(none)_ |
| `strategy` | _(none)_ |
| `cycle` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "profitturning". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `esprit`
- Native catalog key: `profitturning`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
