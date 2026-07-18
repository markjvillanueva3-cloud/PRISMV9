---
name: fusion360-bore-bore
description: fusion360 CAM template for bore (native: BORE)
metadata:
  type: cam-template
  op: bore
  system: fusion360
  nativeKey: BORE
---
## Purpose

The **bore** operation in **fusion360** — exposed natively as "BORE" (catalog key `BORE`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "BORE". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `fusion360`
- Native catalog key: `BORE`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
