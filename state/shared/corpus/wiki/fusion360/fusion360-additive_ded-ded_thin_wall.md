---
name: fusion360-additive_ded-ded_thin_wall
description: fusion360 CAM template for additive_ded (native: DED_THIN_WALL)
metadata:
  type: cam-template
  op: additive_ded
  system: fusion360
  nativeKey: DED_THIN_WALL
---
## Purpose

The **additive_ded** operation in **fusion360** — exposed natively as "DED_THIN_WALL" (catalog key `DED_THIN_WALL`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "DED_THIN_WALL". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_ded`
- CAM system: `fusion360`
- Native catalog key: `DED_THIN_WALL`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
