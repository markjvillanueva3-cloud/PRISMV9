---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-001
title: G12.1 polar coordinate interpolation for face milling on cylindrical parts
category: programming
subcategory: cam_strategy
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:mazak-eia-integrex-iv@ch6-8
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "integrex", "polar-interpolation", "g12.1", "c-axis", "turn-mill", "operation:milling"]
material_groups: []
operation_types: ["milling"]
content_hash: aff887f9fe6f4e75fefc95aa8110980f67fcd19b7b444ebfea690d46a333e274
mirror_ts: 2026-05-05T13:36:01.471Z
mirror_engine: TribalVaultPopulatorEngine
---

# G12.1 polar coordinate interpolation for face milling on cylindrical parts

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:mazak-eia-integrex-iv@ch6-8`

## Tip

G12.1 enables milling features on the face or OD of a round part by converting XY rectangular coordinates to linear+rotational (X+C) axis motion. Program contours as if working on a flat plane; the control converts to synchronized C-axis rotation and X-axis movement. Essential for keyways, flats, hexagons, and cam profiles on turned parts. Cancel with G13.1. Feed rate F is tangential speed in mm/min. Cannot activate/cancel during cutter compensation (G41/G42) — must be in G40 mode.

## Applies to

- Operation types: `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:1+tag:6)_
- [[ctrl-177|Mazak G61.1 geometry compensation for polar interpolation milling accuracy]] _(category+op:1+tag:5)_
- [[ctrl-028|Mazak turning center C-axis and milling M-codes]] _(category+op:1+tag:4)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:1+tag:3)_
- [[ctrl-171|Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup]] _(category+op:1+tag:3)_

## Tags

#mazak #integrex #polar-interpolation #g12-1 #c-axis #turn-mill #operation-milling
