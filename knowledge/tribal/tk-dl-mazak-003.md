---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-003
title: G06.1 spline interpolation for smooth free-form machining
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: tip
confidence: 85
source: document:mazak-eia-integrex-iv@ch6-10
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "spline", "g06.1", "free-form", "interpolation", "smooth-path"]
material_groups: []
operation_types: []
content_hash: b5d3de5d26a6554637cb1f063f8d6cb11ac53644f82a22a3830586fe812ee15a
mirror_ts: 2026-05-05T13:36:03.218Z
mirror_engine: TribalVaultPopulatorEngine
---

# G06.1 spline interpolation for smooth free-form machining

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:mazak-eia-integrex-iv@ch6-10`

## Tip

G06.1 creates smooth curves through specified points without requiring arc segments. The control automatically generates a spline curve that passes through all programmed points. Requires at least 3 points (2+ blocks in spline mode). The curve is automatically divided at corners where the angle between segments exceeds the spline-cancel angle parameter (F101). Cancel with any Group 01 code (G00/G01/G02/G03). Best for free-form surfaces where calculating arc centers would be impractical.

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+tag:1)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+tag:1)_
- [[ctrl-174|Mazak Integrex threading — G292/G276 vs QTU G92/G76]] _(category+tag:1)_
- [[ctrl-176|Mazak Matrix vs Smooth vs 640MT controller — key programming differences]] _(category+tag:1)_
- [[ctrl-171|Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup]] _(category+tag:1)_

## Tags

#mazak #spline #g06-1 #free-form #interpolation #smooth-path
