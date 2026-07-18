---
name: fusion360-additive_ded-ded_multi_axis_lattice
description: fusion360 CAM template for additive_ded (native: DED_MULTI_AXIS_LATTICE)
metadata:
  type: cam-template
  op: additive_ded
  system: fusion360
  nativeKey: DED_MULTI_AXIS_LATTICE
---
## Purpose

The **additive_ded** operation in **fusion360** — exposed natively as "DED_MULTI_AXIS_LATTICE" (catalog key `DED_MULTI_AXIS_LATTICE`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "DED_MULTI_AXIS_LATTICE". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_ded`
- CAM system: `fusion360`
- Native catalog key: `DED_MULTI_AXIS_LATTICE`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
