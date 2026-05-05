---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cast-001
title: Casting shrinkage allowances by material family
category: material
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:mit2008-casting@shrinkage-table
created_at: 2026-03-03
usage_count: 0
tags: ["casting", "shrinkage", "pattern", "allowance", "material-properties", "material:P", "material:Steel", "material:K", "material:Cast Iron", "material:N", "material:Aluminum", "material:bronze"]
material_groups: ["P", "K", "N"]
operation_types: []
content_hash: 88dc2e8236973442fef98b29315dcab5d5e85f8d021fa32c8d70255c9e5fcf89
mirror_ts: 2026-05-05T13:36:02.146Z
mirror_engine: TribalVaultPopulatorEngine
---

# Casting shrinkage allowances by material family

**Category:** `material` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mit2008-casting@shrinkage-table`

## Tip

Pattern dimensions must be oversized to compensate for solidification shrinkage. Typical allowances (mm/m): aluminum alloys 13, aluminum bronze 21, yellow brass 13, gray cast iron 8-13, white cast iron 21, carbon steel 16-21, chromium steel 21, manganese steel 26, magnesium 21, lead 26, zinc 26. Higher-shrinkage alloys (Mn steel, zinc, lead) need more generous patterns and risering. Source: MIT 2.008.

## Applies to

- Material groups: `P`, `K`, `N`

## Related tips

- [[cw-100|Chip-Break Drilling — Partial Retract for Faster Deep Holes]] _(material:3+tag:6)_
- [[mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]] _(material:3+tag:6)_
- [[tk-dl-cnc-005|HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM]] _(material:3+tag:6)_
- [[tk-dl-cnc-007|Flute count by material: Al=2-3, Steel=4, Cast Iron=5-6]] _(material:3+tag:6)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(material:3+tag:4)_

## Tags

#casting #shrinkage #pattern #allowance #material-properties #material-p #material-steel #material-k #material-cast-iron #material-n #material-aluminum #material-bronze
