---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-206
title: Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: rule
confidence: 93
source: controller:mitsubishi_turning_cps_rev44193
created_at: 2026-04-15
usage_count: 0
tags: ["mitsubishi", "turning", "lathe", "g-code-list", "g94", "g95", "g98", "g99", "feed-mode", "post-processor", "compatibility", "operation:turning", "machine:Mitsubishi", "controller:fanuc", "controller:siemens"]
material_groups: []
operation_types: ["turning"]
content_hash: 877933cacc3f46c587d618f77551ebeb60e37a81d93dc81ffbfefd33afae6e9b
mirror_ts: 2026-05-05T13:36:00.976Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `93` · **Source:** `controller:mitsubishi_turning_cps_rev44193`

## Tip

Mitsubishi turning controllers support multiple G-code dialect 'list types' (2 through 7) that change the meaning of key feed and spindle codes. This is selected in CAM post processors as a property. CRITICAL DIFFERENCE: Lists 2, 4, 6 use G98=feed per minute and G99=feed per revolution (Fanuc-style). Lists 3, 5, 7 use G94=feed per minute and G95=feed per revolution (Siemens/ISO-style). The spindle speed limiter code also changes: List 2/4/6 uses G50 Sxxx (max RPM), while List 3/5/7 uses G92 Sxxx. If you output a List 2 program to a List 3 machine: G98 becomes meaningless and the feed mode defaults wrong, causing either a crash (if metric and IPM conflict) or oversized parts (feed too slow). In Autodesk Fusion 360, the Mitsubishi turning post has a 'Type' property defaulting to '3'. JM Die's Mitsubishi lathes use Type 3 — verify before running programs from other shops or when switching posts. Always check the opening block: List 3 should show 'G90 G95 G18' in the header, List 2 shows 'G98 G18'.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:1+tag:4)_
- [[tk-vl-post-003|Lathe post-processor: Mach3/4 Fusion 360 turn post requires G18 (XZ plane) and G95 (feed/rev)]] _(category+op:1+tag:4)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:1+tag:4)_
- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+op:1+tag:3)_
- [[ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]] _(category+op:1+tag:3)_

## Tags

#mitsubishi #turning #lathe #g-code-list #g94 #g95 #g98 #g99 #feed-mode #post-processor #compatibility #operation-turning #machine-mitsubishi #controller-fanuc #controller-siemens
