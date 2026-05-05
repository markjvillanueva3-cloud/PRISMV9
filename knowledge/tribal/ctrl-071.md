---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-071
title: SINUMERIK Tool Management System
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "tool-management", "magazine", "multi-spindle", "tool-life", "sister-tool", "machine:DMG Mori", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: 6d05976bff209abf5ded841c33221ad2a3a334eecae274dd9813cd790193bd0b
mirror_ts: 2026-05-05T13:36:03.951Z
mirror_engine: TribalVaultPopulatorEngine
---

# SINUMERIK Tool Management System

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK 840D sl and ONE feature a comprehensive tool management system stored in the NCK TO (Tool Offset) area. Key commands: T<number> prepares tool (moves magazine to position); M6 executes tool change; D<number> selects cutting edge offset (D1 default, supports multiple edges per tool). Tool data system variables: $TC_DP1-$TC_DP25 (geometry: type, length, radius, wear); $TC_TP1-$TC_TP11 (tool properties: name, type, status, monitoring). Magazine commands: POSM (position magazine), POSMT (position multitool to specific location), MVTOOL (move tool between locations). Multitool support for gang-type and turret machines via $TC_MTP and $TC_MTPP data. Tool monitoring features: tool life ($TC_TP8 remaining time), piece count ($TC_TP9), wear limits with automatic sister tool switchover. SETMS(n) selects master spindle for multi-spindle machines. The 828D has simplified tool management without full magazine management functions. Critical for post-processors: DMG MORI machines typically use T=<number> (flat tool numbering) or T<magazine>.<location> syntax depending on configuration. Always verify the tool call convention with the specific machine's PLC program.

## Related tips

- [[ctrl-076|Multi-Channel Programming and Channel Synchronization]] _(category+tag:5)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+tag:4)_
- [[ctrl-078|SINUMERIK Post-Processor Configuration Essentials]] _(category+tag:4)_
- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+tag:4)_
- [[ctrl-015|Siemens SINUMERIK ONE digital twin advantage]] _(category+tag:3)_

## Tags

#controller #siemens #tool-management #magazine #multi-spindle #tool-life #sister-tool #machine-dmg-mori #controller-siemens
