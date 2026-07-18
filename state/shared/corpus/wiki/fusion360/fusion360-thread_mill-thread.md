---
name: fusion360-thread_mill-thread
description: fusion360 CAM template for thread_mill (native: THREAD)
metadata:
  type: cam-template
  op: thread_mill
  system: fusion360
  nativeKey: THREAD
---
## Purpose

The **thread_mill** operation in **fusion360** — exposed natively as "THREAD" (catalog key `THREAD`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "THREAD". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `thread_mill`
- CAM system: `fusion360`
- Native catalog key: `THREAD`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
