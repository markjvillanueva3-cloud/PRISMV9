---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-117
title: Nakamura-Tome NT Manual Guide i for multitasking programming
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "nakamura-tome", "fanuc-variant", "NT-Manual-Guide", "multitasking", "G112", "operation:drilling", "operation:tapping", "operation:turning", "operation:milling", "machine:Nakamura-Tome", "controller:fanuc"]
material_groups: []
operation_types: ["drilling", "tapping", "turning", "milling"]
content_hash: 27098e42d167d81f6e23ebf0d526306ad85f1d1c3be07cf8db32884361572cdc
mirror_ts: 2026-05-05T13:36:04.001Z
mirror_engine: TribalVaultPopulatorEngine
---

# Nakamura-Tome NT Manual Guide i for multitasking programming

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Nakamura-Tome machines use Fanuc controllers with the NT Manual Guide i — an upgrade from standard Fanuc Manual Guide i tailored for Nakamura multitasking machines. Programs display by spindle, waiting process, or part-transfer process, simplifying multi-axis/multi-turret programming. Detailed 3D guide drawings with coordinate axes and directional marks ensure precise milling operations. G112 enables Polar Coordinate Function, making the C-axis act as a virtual Y-axis for milling flats, hexes, and keyways without physical Y-axis hardware. The 3D Smart Pro AI (latest addition) enhances programming intelligence. When programming live tooling on Fanuc 16-TT or 31i-B controllers, always verify the C-axis zero position and indexing resolution. NT Manual Guide i manages turning, milling, grooving, drilling, and tapping with process rearrangement capability — useful for optimizing cycle times after initial programming.

## Applies to

- Operation types: `drilling`, `tapping`, `turning`, `milling`

## Related tips

- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:4+tag:6)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:4)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:3+tag:5)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:3+tag:5)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:3+tag:4)_

## Tags

#controller #nakamura-tome #fanuc-variant #nt-manual-guide #multitasking #g112 #operation-drilling #operation-tapping #operation-turning #operation-milling #machine-nakamura-tome #controller-fanuc
