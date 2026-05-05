---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-174
title: Mazak Integrex threading — G292/G276 vs QTU G92/G76
category: programming
subcategory: sub_program
domain: cam_software
knowledge_type: rule
confidence: 96
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "g292", "g276", "g92", "g76", "threading", "mill-turn", "lathe", "operation:finishing", "operation:threading", "operation:turning", "machine:Mazak"]
material_groups: []
operation_types: ["finishing", "threading", "turning"]
content_hash: 0fbb9c9b9123148159527ce753258cb414e1e93a6aee6819d6311f1a63d3952f
mirror_ts: 2026-05-05T13:36:00.818Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak Integrex threading — G292/G276 vs QTU G92/G76

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `cam_software`

**Confidence:** `96` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

Mazak Integrex i-series uses different threading G-codes from the QTU/Quick Turn line. Integrex EIA threading: G292 = single-pass threading (equivalent to lathe G92); G276 = multi-pass threading (equivalent to lathe G76). QTU/Quick Turn threading: G92 = single-pass; G76 = multi-pass. This is critical when adapting programs between machine types — a QTU thread program will not run on an Integrex without substituting G92 to G292 and G76 to G276. In Fusion 360, the useSimpleThread property controls output: true = G292 (Integrex) or G92 (QTU); false = G276 (Integrex) or G76 (QTU). G276/G76 two-block format: first block sets tool nose radius and finish allowance, second block defines thread geometry and pitch. Always cancel G96 (CSS) with G97 before threading to prevent RPM variation mid-thread. Threading requires G95 (feed per revolution) mode active.

## Applies to

- Operation types: `finishing`, `threading`, `turning`

## Related tips

- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:3+tag:6)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:3+tag:5)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:4)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:5)_
- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:1+tag:6)_

## Tags

#mazak #integrex #qtu #g292 #g276 #g92 #g76 #threading #mill-turn #lathe #operation-finishing #operation-threading #operation-turning #machine-mazak
