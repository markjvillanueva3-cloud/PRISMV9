---
name: fusion360-laser_cut-laser_cutting
description: fusion360 CAM template for laser_cut (native: LASER_CUTTING)
metadata:
  type: cam-template
  op: laser_cut
  system: fusion360
  nativeKey: LASER_CUTTING
---
## Purpose

The **laser_cut** operation in **fusion360** — exposed natively as "LASER_CUTTING" (catalog key `LASER_CUTTING`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "LASER_CUTTING". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `laser_cut`
- CAM system: `fusion360`
- Native catalog key: `LASER_CUTTING`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
