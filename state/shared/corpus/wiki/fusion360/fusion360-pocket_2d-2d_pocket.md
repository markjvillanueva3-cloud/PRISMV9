---
name: fusion360-pocket_2d-2d_pocket
description: fusion360 CAM template for pocket_2d (native: 2D_POCKET)
metadata:
  type: cam-template
  op: pocket_2d
  system: fusion360
  nativeKey: 2D_POCKET
---
## Purpose

The **pocket_2d** operation in **fusion360** — exposed natively as "2D_POCKET" (catalog key `2D_POCKET`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "2D_POCKET". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `pocket_2d`
- CAM system: `fusion360`
- Native catalog key: `2D_POCKET`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
