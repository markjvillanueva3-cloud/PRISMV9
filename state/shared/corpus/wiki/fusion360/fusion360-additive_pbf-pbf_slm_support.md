---
name: fusion360-additive_pbf-pbf_slm_support
description: fusion360 CAM template for additive_pbf (native: PBF_SLM_SUPPORT)
metadata:
  type: cam-template
  op: additive_pbf
  system: fusion360
  nativeKey: PBF_SLM_SUPPORT
---
## Purpose

The **additive_pbf** operation in **fusion360** — exposed natively as "PBF_SLM_SUPPORT" (catalog key `PBF_SLM_SUPPORT`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "PBF_SLM_SUPPORT". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `additive_pbf`
- CAM system: `fusion360`
- Native catalog key: `PBF_SLM_SUPPORT`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
