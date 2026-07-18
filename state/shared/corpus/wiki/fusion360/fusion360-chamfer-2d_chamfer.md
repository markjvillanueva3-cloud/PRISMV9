---
name: fusion360-chamfer-2d_chamfer
description: fusion360 CAM template for chamfer (native: 2D_CHAMFER)
metadata:
  type: cam-template
  op: chamfer
  system: fusion360
  nativeKey: 2D_CHAMFER
---
## Purpose

The **chamfer** operation in **fusion360** — exposed natively as "2D_CHAMFER" (catalog key `2D_CHAMFER`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "2D_CHAMFER". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `chamfer`
- CAM system: `fusion360`
- Native catalog key: `2D_CHAMFER`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
