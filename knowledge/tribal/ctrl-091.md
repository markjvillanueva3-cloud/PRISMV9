---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-091
title: Haas probing setup requirements and WIPS integration
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "haas", "probing", "WIPS", "Renishaw", "setup", "machine:Haas"]
material_groups: []
operation_types: []
content_hash: 1eff41cd896d4b58d8c48c5dba57d748f03eb33f50b9302d8e7a8edaceed2724
mirror_ts: 2026-05-05T13:36:03.973Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas probing setup requirements and WIPS integration

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Haas probing requires multiple options enabled via unlock codes: spindle orientation, macros (Setting 9), coordinate rotation and scaling. The Renishaw 9000-series programs must be loaded. NGC introduced WIPS (Wireless Intuitive Probe System) which simplifies probe setup through guided dialogs. Key settings: Setting 59 (probe diameter), Setting 65 (probe overtravel). Probe results stored in macro variables #140-#199 (Renishaw) or system variables. Always verify probe stylus calibration ring diameter matches Setting 119. Tool setter requires separate calibration macro (O09995).

## Related tips

- [[ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]] _(category+tag:4)_
- [[ctrl-192|Haas UMC G234 TCPC — pivot distance setup and crash prevention]] _(category+tag:3)_
- [[ctrl-023|Haas macro variables and probing]] _(category+tag:3)_
- [[ctrl-088|Haas G187 accuracy/speed control for HSM]] _(category+tag:3)_
- [[ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]] _(category+tag:3)_

## Tags

#controller #haas #probing #wips #renishaw #setup #machine-haas
