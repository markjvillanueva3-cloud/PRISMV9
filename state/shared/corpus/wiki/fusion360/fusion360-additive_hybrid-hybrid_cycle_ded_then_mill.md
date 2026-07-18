---
name: fusion360-additive_hybrid-hybrid_cycle_ded_then_mill
description: fusion360 CAM template for additive_hybrid (native: HYBRID_CYCLE_DED_THEN_MILL)
metadata:
  type: cam-template
  op: additive_hybrid
  system: fusion360
  nativeKey: HYBRID_CYCLE_DED_THEN_MILL
---
## Purpose

The **additive_hybrid** operation in **fusion360** — exposed natively as "HYBRID_CYCLE_DED_THEN_MILL" (catalog key `HYBRID_CYCLE_DED_THEN_MILL`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "HYBRID_CYCLE_DED_THEN_MILL". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_hybrid`
- CAM system: `fusion360`
- Native catalog key: `HYBRID_CYCLE_DED_THEN_MILL`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
