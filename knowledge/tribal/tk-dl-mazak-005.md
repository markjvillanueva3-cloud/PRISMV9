---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-005
title: G68.5 tilted working plane for angled feature machining on INTEGREX
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:mazak-eia-integrex-iv@ch15-12
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "integrex", "tilted-plane", "g68.5", "coordinate-rotation", "angled-features", "machine:Mazak"]
material_groups: []
operation_types: []
content_hash: a6998fefefb94f88748ec1c2f020330a2e3315f904c0d2567705beeab654bbbc
mirror_ts: 2026-05-05T13:36:02.150Z
mirror_engine: TribalVaultPopulatorEngine
---

# G68.5 tilted working plane for angled feature machining on INTEGREX

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mazak-eia-integrex-iv@ch15-12`

## Tip

G68.5 (Mazak T-series) or G68 (M-series) activates 3D coordinate conversion to define a tilted working plane. After setting the B-axis angle, G68.5 rotates the programming coordinate system so you can program features (holes, pockets, contours) as if working on a flat surface, even though the actual machining is at an angle. Cancel with G69.5/G69. Essential for machining features on angled faces of complex parts without recalculating coordinates manually.

## Related tips

- [[ctrl-171|Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup]] _(category+tag:4)_
- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+tag:3)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+tag:3)_
- [[ctrl-174|Mazak Integrex threading — G292/G276 vs QTU G92/G76]] _(category+tag:3)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+tag:3)_

## Tags

#mazak #integrex #tilted-plane #g68-5 #coordinate-rotation #angled-features #machine-mazak
