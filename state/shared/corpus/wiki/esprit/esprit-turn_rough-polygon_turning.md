---
name: esprit-turn_rough-polygon_turning
description: esprit CAM template for turn_rough (native: polygon turning)
metadata:
  type: cam-template
  op: turn_rough
  system: esprit
  nativeKey: polygon_turning
---
## Purpose

The **turn_rough** operation in **esprit** — exposed natively as "polygon turning" (catalog key `polygon_turning`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `polygon` | _(none)_ |
| `sync` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "polygon turning". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `esprit`
- Native catalog key: `polygon_turning`
- Parameter count: 2

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
