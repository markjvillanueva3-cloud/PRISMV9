---
name: fusion360-additive_pbf-pbf_slm_part
description: fusion360 CAM template for additive_pbf (native: PBF_SLM_PART)
metadata:
  type: cam-template
  op: additive_pbf
  system: fusion360
  nativeKey: PBF_SLM_PART
---
## Purpose

The **additive_pbf** operation in **fusion360** — exposed natively as "PBF_SLM_PART" (catalog key `PBF_SLM_PART`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "PBF_SLM_PART". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_pbf`
- CAM system: `fusion360`
- Native catalog key: `PBF_SLM_PART`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
