---
name: fusion360-slot-slot
description: fusion360 CAM template for slot (native: SLOT)
metadata:
  type: cam-template
  op: slot
  system: fusion360
  nativeKey: SLOT
---
## Purpose

The **slot** operation in **fusion360** — exposed natively as "SLOT" (catalog key `SLOT`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "SLOT". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `slot`
- CAM system: `fusion360`
- Native catalog key: `SLOT`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
