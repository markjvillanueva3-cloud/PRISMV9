---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-064
title: Fanuc turning vs milling controller G-code conflicts
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "turning-vs-milling", "G-code-conflicts", "safety", "programming", "operation:face_milling", "operation:drilling", "operation:tapping", "operation:boring", "operation:threading", "operation:turning", "operation:milling", "operation:hsm", "controller:fanuc"]
material_groups: []
operation_types: ["face_milling", "drilling", "tapping", "boring", "threading", "turning", "milling", "hsm"]
content_hash: 744948eedb86ecda473239f1f67c31288f12016d0d860f79dc7407d0b71f8bcf
mirror_ts: 2026-05-05T13:36:03.943Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc turning vs milling controller G-code conflicts

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Several G-codes have DIFFERENT meanings on Fanuc turning (0i-TF) vs milling (0i-MF) controllers — a critical source of programming errors. G73: Milling = high-speed peck drilling; Turning = pattern repeating cycle. G74: Milling = LH tapping; Turning = face peck drilling/grooving. G75: Not standard on milling; Turning = OD/ID grooving cycle. G76: Milling = fine boring; Turning = multi-pass threading cycle. G90: Milling = absolute positioning mode; Turning = single-pass turning cycle (absolute/incremental is handled differently). G92: Milling = work coordinate preset; Turning = threading cycle. G94: Milling = feed per minute mode; Turning = facing cycle. When switching between mill and lathe programming, always verify G-code meaning against the specific control type. Mill-turn machines with both turret and milling spindle use path-specific G-code interpretation.

## Applies to

- Operation types: `face_milling`, `drilling`, `tapping`, `boring`, `threading`, `turning`, `milling`, `hsm`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:7+tag:7)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:5+tag:8)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:5+tag:8)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:5+tag:5)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:4+tag:6)_

## Tags

#controller #fanuc #turning-vs-milling #g-code-conflicts #safety #programming #operation-face_milling #operation-drilling #operation-tapping #operation-boring #operation-threading #operation-turning #operation-milling #operation-hsm #controller-fanuc
