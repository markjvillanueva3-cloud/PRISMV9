---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-172
title: Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained
category: programming
subcategory: post_processor
domain: cam_software
knowledge_type: correction
confidence: 96
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "m200", "m203", "m303", "spindle", "mill-turn", "sub-spindle", "live-tool", "m-codes", "operation:turning", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: 0b5d875f24e1ce8b236c9244a3caf5e9f5abc3c2e264736a7f8141bc1b0528bd
mirror_ts: 2026-05-05T13:36:00.817Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `cam_software`

**Confidence:** `96` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

Mazak mill-turn machines use a three-tier M-code spindle scheme. On both Integrex and QTU: live milling spindle = M3 (CW) / M4 (CCW) / M5 (stop); main turning spindle = M203 / M204 / M205; sub turning spindle = M303 / M304 / M305. C-axis engagement: main spindle = M200 (engage) / M202 (disengage); sub = M300 / M302. Spindle clamp for indexing: main = M210 (clamp) / M212 (unclamp); sub = M310 / M312. Chuck control: main = M207 (clamp) / M206 (unclamp); sub = M307 / M306. C-axis brake (separate from clamp): main = M14 (lock) / M15 (unlock); sub = M114 / M115. In Fusion 360 posts, SPINDLE_MAIN maps to M203-M205, SPINDLE_SUB maps to M303-M305, SPINDLE_LIVE maps to M3-M5. Spindle orient: main = M19; sub = M39. When posting multi-spindle operations, verify Fusion spindle assignments match the actual machine — incorrect mapping causes the wrong spindle to start and can destroy workholding or the part.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:2+tag:8)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:2+tag:7)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:2+tag:6)_
- [[ctrl-028|Mazak turning center C-axis and milling M-codes]] _(category+op:2+tag:6)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:5)_

## Tags

#mazak #integrex #qtu #m200 #m203 #m303 #spindle #mill-turn #sub-spindle #live-tool #m-codes #operation-turning #operation-milling #machine-mazak
