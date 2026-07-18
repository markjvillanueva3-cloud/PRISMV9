---
name: fusion360-face-face
description: fusion360 CAM template for face (native: FACE)
metadata:
  type: cam-template
  op: face
  system: fusion360
  nativeKey: FACE
---
## Purpose

The **face** operation in **fusion360** — exposed natively as "FACE" (catalog key `FACE`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "FACE". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `fusion360`
- Native catalog key: `FACE`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
