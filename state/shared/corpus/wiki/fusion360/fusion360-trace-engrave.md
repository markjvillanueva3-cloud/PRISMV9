---
name: fusion360-trace-engrave
description: fusion360 CAM template for trace (native: ENGRAVE)
metadata:
  type: cam-template
  op: trace
  system: fusion360
  nativeKey: ENGRAVE
---
## Purpose

The **trace** operation in **fusion360** — exposed natively as "ENGRAVE" (catalog key `ENGRAVE`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "ENGRAVE". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `trace`
- CAM system: `fusion360`
- Native catalog key: `ENGRAVE`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
