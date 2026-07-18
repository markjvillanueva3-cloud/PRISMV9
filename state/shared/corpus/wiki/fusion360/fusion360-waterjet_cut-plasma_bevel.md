---
name: fusion360-waterjet_cut-plasma_bevel
description: fusion360 CAM template for waterjet_cut (native: PLASMA_BEVEL)
metadata:
  type: cam-template
  op: waterjet_cut
  system: fusion360
  nativeKey: PLASMA_BEVEL
---
## Purpose

The **waterjet_cut** operation in **fusion360** — exposed natively as "PLASMA_BEVEL" (catalog key `PLASMA_BEVEL`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "PLASMA_BEVEL". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `waterjet_cut`
- CAM system: `fusion360`
- Native catalog key: `PLASMA_BEVEL`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
