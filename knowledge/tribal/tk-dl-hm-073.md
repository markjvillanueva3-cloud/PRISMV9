---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-073
title: Workplane on axial face/hole for drilling setups
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 93
source: document:hypercad-s-v33@p205
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "workplane", "drilling", "hole", "operation:drilling"]
material_groups: []
operation_types: ["drilling"]
content_hash: 87a71e9bbca146388761ff72a6d2506cb42bf12160d7e2b7d2d29e971380a941
mirror_ts: 2026-05-05T13:36:00.946Z
mirror_engine: TribalVaultPopulatorEngine
---

# Workplane on axial face/hole for drilling setups

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:hypercad-s-v33@p205`

## Tip

Use Workplane → On axial face / hole (v2022.1+) to create a workplane centered on a hole with Z along the center line. Select the hole face, then choose Position at Start parameter (upper edge) or End parameter (lower edge). For feature-recognized holes, select the hole feature directly. This eliminates manual center-point calculation and ensures the WP is perfectly aligned for drilling cycle programming.

## Applies to

- Operation types: `drilling`

## Related tips

- [[tk-dl-hm-120|AC second setup: auto-assign drilling jobs by Z-axis angle filter]] _(category+op:1+tag:3)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:3)_
- [[tk-dl-hm-070|Workplane On Face for 5-axis setups]] _(category+tag:3)_
- [[tk-dl-hm-072|Workplane through 3 points axis control]] _(category+tag:3)_
- [[tk-dl-hm-074|Redefine workplane type without recreating]] _(category+tag:3)_

## Tags

#hypermill #hypercad-s #workplane #drilling #hole #operation-drilling
