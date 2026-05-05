---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-078
title: Invert faces UV-parameter for CAM isoparameter machining
category: design
domain: document_learned
knowledge_type: tip
confidence: 89
source: document:hypercad-s-v33@p263
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "UV-parameter", "surface-editing", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: f346e24e3f341e0c6fe4adda65524691e9558ab8da8286200a3cbd74a2e63ec3
mirror_ts: 2026-05-05T13:36:01.808Z
mirror_engine: TribalVaultPopulatorEngine
---

# Invert faces UV-parameter for CAM isoparameter machining

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `89` · **Source:** `document:hypercad-s-v33@p263`

## Tip

Use Modify → Invert faces UV-parameter to swap or invert U/V directions on faces. Essential for CAM strategies that follow isoparametric curves (e.g., Z-level finishing, flow-line machining). Non-NURBS faces are auto-converted to NURBS (tolerance 0.001mm). Options: Invert U, Invert V, Swap U/V.

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+op:1+tag:1)_
- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+tag:2)_
- [[tk-dl-hm-084|V-sketch as updatable machining contour]] _(category+tag:2)_
- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+tag:2)_
- [[tk-dl-hm-096|Hole feature with Keep CAD features for CAM mapping]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #uv-parameter #surface-editing #operation-finishing
