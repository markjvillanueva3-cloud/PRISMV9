---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-094
title: MAZATROL M-code and G-code documentation is buried — search tips
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "mazak", "M-codes", "documentation", "reference", "machine:Mazak", "controller:fanuc", "controller:mazak"]
material_groups: []
operation_types: []
content_hash: 67d39065ab245d647100c0e96cf11b372c712a95712eedb62930675e83a59b25
mirror_ts: 2026-05-05T13:36:03.976Z
mirror_engine: TribalVaultPopulatorEngine
---

# MAZATROL M-code and G-code documentation is buried — search tips

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Mazak typically buries their G/M-code reference tables deep in the middle of programming manuals, NOT in the table of contents or index. You must search through the manual to find them. Key Mazak-specific M-codes: M20-M29 for robot integration, M11 for spindle tool unclamp (NOT table unclamp like Fanuc). MAZATROL G-codes are Fanuc-compatible for standard codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) but machine-specific M-codes are heavily customized. Always request the specific machine's M-code list from the dealer at purchase time.

## Related tips

- [[ctrl-092|MAZATROL conversational vs EIA/ISO — interoperability]] _(category+tag:5)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+tag:4)_
- [[ctrl-175|Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters]] _(category+tag:4)_
- [[ctrl-026|Mazak MAZATROL Smooth conversational vs EIA/ISO]] _(category+tag:4)_
- [[ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]] _(category+tag:4)_

## Tags

#controller #mazak #m-codes #documentation #reference #machine-mazak #controller-fanuc #controller-mazak
