---
name: esprit-rest_machine-balanced_cut
description: esprit CAM template for rest_machine (native: balanced cut)
metadata:
  type: cam-template
  op: rest_machine
  system: esprit
  nativeKey: balanced_cut
---
## Purpose

The **rest_machine** operation in **esprit** — exposed natively as "balanced cut" (catalog key `balanced_cut`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `channels` | _(none)_ |
| `sync` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "balanced cut". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `rest_machine`
- CAM system: `esprit`
- Native catalog key: `balanced_cut`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
