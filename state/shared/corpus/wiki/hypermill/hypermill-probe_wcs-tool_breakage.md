---
name: hypermill-probe_wcs-tool_breakage
description: hypermill CAM template for probe_wcs (native: tool breakage)
metadata:
  type: cam-template
  op: probe_wcs
  system: hypermill
  nativeKey: tool_breakage
---
## Purpose

The **probe_wcs** operation in **hypermill** — exposed natively as "tool breakage" (catalog key `tool_breakage`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "tool breakage". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `probe_wcs`
- CAM system: `hypermill`
- Native catalog key: `tool_breakage`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
