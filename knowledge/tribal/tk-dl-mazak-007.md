---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-007
title: Mazatrol unit-based programming: Common -> Material -> Process units
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:mazak-mazatrol-matrix@ch3
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "mazatrol", "conversational", "unit-structure", "program-organization", "operation:face_milling", "operation:pocketing", "operation:profiling", "operation:drilling", "operation:tapping", "operation:boring", "operation:threading", "operation:turning", "operation:milling", "machine:Mazak", "controller:mazak"]
material_groups: []
operation_types: ["face_milling", "pocketing", "profiling", "drilling", "tapping", "boring", "threading", "turning", "milling"]
content_hash: 0205f8119565892c0c71272fd189f830fcfad26114cb3b8662eff00dbb35b739
mirror_ts: 2026-05-05T13:36:02.151Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazatrol unit-based programming: Common -> Material -> Process units

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mazak-mazatrol-matrix@ch3`

## Tip

Mazatrol programs follow a strict unit structure: (1) Common unit defines workpiece coordinate system, (2) Material Shape unit defines blank geometry, (3) Process units define machining operations. Process units include: Point (drilling/tapping/boring), Line (contour milling), Face (pocket/face milling), Turning (OD/ID/face), Bar (bar stock), Copy (pattern repeat), Corner, Facing, Threading, Grooving, and Mill-Turn. Each unit auto-develops its own tool sequence. The structure ensures safe approach/retract between units and enables automatic cutting condition calculation.

## Applies to

- Operation types: `face_milling`, `pocketing`, `profiling`, `drilling`, `tapping`, `boring`, `threading`, `turning`, `milling`

## Related tips

- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:7+tag:8)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:7+tag:7)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:6+tag:7)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:6+tag:6)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:4+tag:9)_

## Tags

#mazak #mazatrol #conversational #unit-structure #program-organization #operation-face_milling #operation-pocketing #operation-profiling #operation-drilling #operation-tapping #operation-boring #operation-threading #operation-turning #operation-milling #machine-mazak #controller-mazak
