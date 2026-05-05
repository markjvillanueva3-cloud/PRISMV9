---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-234
title: JM Die Okuma Multus subspindle operations — grab, pull, cutoff sequence
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 96
source: shop:jm_die_cnc_okuma_multus_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "multus", "subspindle", "bar-pull", "m247", "m248", "m249", "synchronized-rotation", "cutoff", "machine:Okuma"]
material_groups: []
operation_types: []
content_hash: 4b6185148798aadd168b1754157eea8c89a39c3b9e84d8c2460fca85933368a2
mirror_ts: 2026-05-05T13:36:00.825Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma Multus subspindle operations — grab, pull, cutoff sequence

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `shop:jm_die_cnc_okuma_multus_programs`

## Tip

JM Die Multus subspindle bar pull sequence: (1) M247 (sub chuck interlock release on), M185 (main chuck interlock release on), (2) M249 (unclamp sub chuck), G4 F1. (dwell), (3) G97 S400 M4 M151 (sub spindle on, sync rotation), (4) M51 (clean out chips), M289/M288 (auxiliary functions), (5) G0 W0. then G1 W-0.86 F25. (approach and grab part with W-axis), (6) M248 (clamp sub chuck), G4 F0.5, (7) M84 (unclamp main chuck), (8) G1 W0.49 F25. (bar pull distance), (9) M83 (clamp main chuck). After part is transferred: cutoff with TD=120054, then M150 (sync rotation off), G0 W100. (sub retract). The W-axis values are critical and part-specific.

## Related tips

- [[ctrl-233|JM Die Okuma Multus B250II initialization — dual spindle mill-turn setup]] _(category+tag:4)_
- [[ctrl-235|JM Die Okuma Multus part counter — automated batch production control]] _(category+tag:4)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+tag:3)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+tag:3)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+tag:3)_

## Tags

#jm-die #okuma #multus #subspindle #bar-pull #m247 #m248 #m249 #synchronized-rotation #cutoff #machine-okuma
