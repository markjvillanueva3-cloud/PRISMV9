---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-178
title: Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:mazak_qtu200m_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "part-catcher", "m48", "m49", "m248", "m249", "m185", "part-ejector", "tailstock", "m841", "operation:turning", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: cee4fd2b7168b8affdbeb4ca4569d00323de758c0b6dd1ebc8d2b2fa388016e9
mirror_ts: 2026-05-05T13:36:00.973Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:mazak_qtu200m_cps_rev44199`

## Tip

Mazak mill-turn machines use different M-codes for part catchers depending on model. QTU / Quick Turn series: M48 = part catcher extend (position to catch part); M49 = part catcher retract. Integrex i-series: M248 = part catcher extend; M249 = part catcher retract. QTU part ejector: M185 = cycle the part ejector (ejects part into catcher after cutoff). The Fusion post property usePartCatcher=true outputs these codes automatically at program end after cutoff operations. On QTU with secondary spindle (MSY model), autoEject=true triggers M185 after sub-spindle part-off. Tailstock M-codes also differ: Integrex = M841 (advance) / M843 (retract); QTU = M741 / M743. When adapting a program between QTU and Integrex, all part handling codes must be substituted — they are not cross-compatible. For programs run on both machines, use a controller-type conditional macro or maintain separate post outputs for each machine.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:2+tag:6)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:2+tag:6)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:2+tag:6)_
- [[ctrl-028|Mazak turning center C-axis and milling M-codes]] _(category+op:2+tag:5)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:4)_

## Tags

#mazak #integrex #qtu #part-catcher #m48 #m49 #m248 #m249 #m185 #part-ejector #tailstock #m841 #operation-turning #operation-milling #machine-mazak
