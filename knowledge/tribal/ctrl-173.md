---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-173
title: Mazak spindle synchronization M511/M513 and stock transfer sequence
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: workaround
confidence: 94
source: controller:mazak_qtu200m_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "m511", "m513", "spindle-sync", "stock-transfer", "sub-spindle", "m31", "m380", "torque", "operation:turning", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: e13bf93f38a3ada70fc215e4610497d950e855bdc8e22df599cde19aad92cc3c
mirror_ts: 2026-05-05T13:36:00.908Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak spindle synchronization M511/M513 and stock transfer sequence

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:mazak_qtu200m_cps_rev44199`

## Tip

Bar stock transfer between main and sub spindle on Mazak mill-turn uses spindle synchronization to prevent part damage. Phase synchronization (M511) locks both spindles at the same angular position — both chucks open/close at the same rotational angle, preventing part twist during handoff. Speed synchronization (M511 on Matrix/Smooth, M380 on 640MT) matches RPM so the sub spindle can grip without relative motion. Transfer sequence: (1) M511 to synchronize spindles; (2) Advance sub spindle to grip position using W[position] sub-spindle Z move; (3) M31 interlock bypass ON — allows sub chuck to close while main chuck is still clamped; (4) M307 close sub chuck; (5) M206 open main chuck; (6) M32 interlock bypass OFF; (7) M513 cancel synchronization. For torque-controlled transfer (transferUseTorque=yes in Fusion post): M508 engages torque skip — the sub spindle pulls with limited torque to seat the part before handoff; M509 cancels torque skip. On 640MT controllers use M380/M381 instead of M511/M513.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:2+tag:7)_
- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:2+tag:6)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:2+tag:6)_
- [[ctrl-028|Mazak turning center C-axis and milling M-codes]] _(category+op:2+tag:5)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:4)_

## Tags

#mazak #integrex #qtu #m511 #m513 #spindle-sync #stock-transfer #sub-spindle #m31 #m380 #torque #operation-turning #operation-milling #machine-mazak
