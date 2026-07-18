---
name: esprit-pocket_2d-pocket_rough
description: esprit CAM template for pocket_2d (native: pocket rough)
metadata:
  type: cam-template
  op: pocket_2d
  system: esprit
  nativeKey: pocket_rough
---
## Purpose

The **pocket_2d** operation in **esprit** — exposed natively as "pocket rough" (catalog key `pocket_rough`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `boundary` | _(none)_ |
| `levels` | _(none)_ |
| `stepover` | _(none)_ |
| `entry` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "pocket rough". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `esprit`
- Native catalog key: `pocket_rough`
- Parameter count: 4

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
