---
name: fusion360-additive_fdm-fdm_infill_pattern
description: fusion360 CAM template for additive_fdm (native: FDM_INFILL_PATTERN)
metadata:
  type: cam-template
  op: additive_fdm
  system: fusion360
  nativeKey: FDM_INFILL_PATTERN
---
## Purpose

The **additive_fdm** operation in **fusion360** — exposed natively as "FDM_INFILL_PATTERN" (catalog key `FDM_INFILL_PATTERN`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "FDM_INFILL_PATTERN". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_fdm`
- CAM system: `fusion360`
- Native catalog key: `FDM_INFILL_PATTERN`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
