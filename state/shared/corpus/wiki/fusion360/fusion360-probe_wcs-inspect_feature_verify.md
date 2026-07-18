---
name: fusion360-probe_wcs-inspect_feature_verify
description: fusion360 CAM template for probe_wcs (native: INSPECT_FEATURE_VERIFY)
metadata:
  type: cam-template
  op: probe_wcs
  system: fusion360
  nativeKey: INSPECT_FEATURE_VERIFY
---
## Purpose

The **probe_wcs** operation in **fusion360** — exposed natively as "INSPECT_FEATURE_VERIFY" (catalog key `INSPECT_FEATURE_VERIFY`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In fusion360, this operation is reached via its catalog UI under the function family that owns "INSPECT_FEATURE_VERIFY". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `probe_wcs`
- CAM system: `fusion360`
- Native catalog key: `INSPECT_FEATURE_VERIFY`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
