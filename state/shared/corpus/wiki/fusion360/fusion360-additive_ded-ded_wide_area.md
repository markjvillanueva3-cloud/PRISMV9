---
name: fusion360-additive_ded-ded_wide_area
description: fusion360 CAM template for additive_ded (native: DED_WIDE_AREA)
metadata:
  type: cam-template
  op: additive_ded
  system: fusion360
  nativeKey: DED_WIDE_AREA
---
## Purpose

The **additive_ded** operation in **fusion360** — exposed natively as "DED_WIDE_AREA" (catalog key `DED_WIDE_AREA`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "DED_WIDE_AREA". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_ded`
- CAM system: `fusion360`
- Native catalog key: `DED_WIDE_AREA`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
