---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-070
title: ShopMill/ShopTurn Conversational Programming
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "ShopMill", "ShopTurn", "conversational", "programming", "shop-floor", "operation:pocketing", "operation:profiling", "operation:drilling", "operation:threading", "operation:turning", "operation:milling", "controller:siemens"]
material_groups: []
operation_types: ["pocketing", "profiling", "drilling", "threading", "turning", "milling"]
content_hash: e9e6f86a95a0cf03e32f83a292c934881e3327b29a8d24459c6ebbd127154e07
mirror_ts: 2026-05-05T13:36:03.950Z
mirror_engine: TribalVaultPopulatorEngine
---

# ShopMill/ShopTurn Conversational Programming

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

ShopMill (milling) and ShopTurn (turning) are Siemens' built-in conversational programming interfaces within SINUMERIK Operate, enabling shop-floor part programming without G-code knowledge. Programs are created by selecting operations from graphical menus and filling in parameter forms with animated tool tips and dynamic graphics. Key features: (1) Full cycle library including drilling, pocketing, contouring, thread milling, and pattern operations; (2) Inline simulation with 3D workpiece visualization before running; (3) Mix-and-match capability to combine conversational blocks with G-code blocks in the same program; (4) Contour calculator for direct geometry definition with automatic intersection calculation; (5) Technology database for automatic feed/speed recommendations; (6) Position patterns (linear, grid, circular) with ability to hide selected positions. ShopMill/ShopTurn programs are stored as standard .MPF files and are fully editable in G-code mode. Available on all SINUMERIK platforms (828D, 840D sl, ONE). Particularly valuable for one-off parts, prototype work, and simple production jobs where CAM programming overhead is not justified. Training tip: SinuTrain PC software provides identical ShopMill/ShopTurn interface for offline training.

## Applies to

- Operation types: `pocketing`, `profiling`, `drilling`, `threading`, `turning`, `milling`

## Related tips

- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:6+tag:7)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:6+tag:7)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:5+tag:6)_
- [[ctrl-168|Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code]] _(category+op:4+tag:7)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:4+tag:6)_

## Tags

#controller #siemens #shopmill #shopturn #conversational #programming #shop-floor #operation-pocketing #operation-profiling #operation-drilling #operation-threading #operation-turning #operation-milling #controller-siemens
