---
name: esprit-contour_3d-z_level_finish
description: esprit CAM template for contour_3d (native: z level finish)
metadata:
  type: cam-template
  op: contour_3d
  system: esprit
  nativeKey: z_level_finish
---
## Purpose

The **contour_3d** operation in **esprit** — exposed natively as "z level finish" (catalog key `z_level_finish`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `drive` | _(none)_ |
| `levels` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "z level finish". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_3d`
- CAM system: `esprit`
- Native catalog key: `z_level_finish`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
