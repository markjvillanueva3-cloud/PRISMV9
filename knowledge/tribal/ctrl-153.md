---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-153
title: Fanuc G76 fine boring — shift direction and dwell
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 91
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "g76", "fine-boring", "witness-mark", "spindle-orient", "m19", "boring", "finishing", "operation:finishing", "operation:boring", "controller:fanuc"]
material_groups: []
operation_types: ["finishing", "boring"]
content_hash: 5c2d888e34f17ef73b66b6c86b39c7b6dd14152ba8f7bae03d8379a2a1261323
mirror_ts: 2026-05-05T13:36:01.219Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G76 fine boring — shift direction and dwell

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

G76 (fine boring) avoids a witness mark by orienting the spindle (M19), shifting the tool by Q amount, retracting, then shifting back. Syntax: G98 G76 X_ Y_ Z_ R_ P_ Q_ F_. P is dwell in milliseconds (always include even if small — try P200 minimum). Q is the shift distance; direction is controlled by parameter #5101 bit 4 (default: +X direction). The Fusion post outputs Q using xyzFormat (3 decimal places in metric). For precision bores specify Q = 0.050–0.100 mm typical. A dwell P at the bottom before the orient step is strongly recommended to let the bore finish cutting before shift — P500 for finishing passes. G76 is modal group 9 (canned cycles) — cancel with G80.

## Applies to

- Operation types: `finishing`, `boring`

## Related tips

- [[ctrl-191|Haas NGC M19 spindle orient — P-angle and Q-direction for precise back-boring]] _(category+op:1+tag:5)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:1+tag:4)_
- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:2+tag:2)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:2+tag:2)_
- [[tk-dl-gcode-css-001|G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed]] _(category+op:2+tag:2)_

## Tags

#fanuc #g76 #fine-boring #witness-mark #spindle-orient #m19 #boring #finishing #operation-finishing #operation-boring #controller-fanuc
