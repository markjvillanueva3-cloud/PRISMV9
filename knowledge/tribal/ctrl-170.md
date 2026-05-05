---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-170
title: Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 96
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "g12.1", "polar-interpolation", "mill-turn", "live-tooling", "c-axis", "m200", "sequence", "operation:turning", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: 9ca95874110bc2c399f4a1543be164824304244fa90954232736dc26f42d490e
mirror_ts: 2026-05-05T13:36:00.815Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

G12.1 polar interpolation enables milling of flat features (hex flats, keyways, slots) on the OD of turned parts using the C-axis and live tooling. Required activation sequence: (1) Stop turning spindle: M205 (Integrex main) or M5 (QTU); (2) Engage C-axis: M200 (main spindle); (3) Select milling plane: G17; (4) Set RPM: G97 S[rpm]; (5) Enable geometry comp: G61.1 (useG61=true in Fusion post); (6) Activate polar: G12.1; (7) Start live tool: M3 S[rpm]. During polar mode, XY moves are converted to X-radius and C-rotation. Cancel sequence: M5 (stop live tool), G13.1 (cancel polar), G40 or G61 (cancel geometry comp), M202 (disengage C-axis), then restart turning spindle M203. CRITICAL: always cancel G12.1 with G13.1 before any turning pass. Omitting G13.1 causes the control to interpret the next X turning move as Cartesian rather than diameter mode, resulting in a crash. For Integrex sub-spindle polar: G12.1 P2 activates polar on sub spindle.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:2+tag:8)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:2+tag:6)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:2+tag:6)_
- [[ctrl-028|Mazak turning center C-axis and milling M-codes]] _(category+op:2+tag:6)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:5)_

## Tags

#mazak #integrex #qtu #g12-1 #polar-interpolation #mill-turn #live-tooling #c-axis #m200 #sequence #operation-turning #operation-milling #machine-mazak
