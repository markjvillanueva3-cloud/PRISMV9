---
name: esprit-contour_2d-contour_finish
description: esprit CAM template for contour_2d (native: contour finish)
metadata:
  type: cam-template
  op: contour_2d
  system: esprit
  nativeKey: contour_finish
---
## Purpose

The **contour_2d** operation in **esprit** — exposed natively as "contour finish" (catalog key `contour_finish`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `profile` | _(none)_ |
| `levels` | _(none)_ |
| `lead` | _(none)_ |
| `cycle` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "contour finish". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `contour_2d`
- CAM system: `esprit`
- Native catalog key: `contour_finish`
- Parameter count: 4

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
