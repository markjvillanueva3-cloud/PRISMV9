---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-080
title: SINUMERIK System Variables and Adaptive Machining
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: quote_correction
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "system-variables", "adaptive-machining", "monitoring", "synchronized-actions", "spindle-load", "operation:adaptive_milling", "controller:siemens"]
material_groups: []
operation_types: ["adaptive_milling"]
content_hash: ad50ef3fa5a474af6973516599ff153098e661eb081ac0956395810ad5b0dc2e
mirror_ts: 2026-05-05T13:36:03.962Z
mirror_engine: TribalVaultPopulatorEngine
---

# SINUMERIK System Variables and Adaptive Machining

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK exposes extensive system variables ($-variables) enabling adaptive machining strategies via synchronized actions or user cycles. Key variable families: **Drive/axis**: $AA_IM[axis] (actual position), $AA_LOAD[axis] (axis load %), $VA_CURR[axis] (drive current). **Spindle**: $AC_POWER (current spindle power as % of rated), $AN_SACT[spindle] (actual spindle speed), $AC_TORQUE (spindle torque). **Feed**: $AC_OVR (feed override %), $AC_VACTW (actual path velocity), $AC_DTEW (distance to end of block). **Program**: $P_TOOLNO (active tool number), $P_F (programmed feed), $P_S (programmed speed), $AC_TIME (machining time). Adaptive feed control example: ID=1 WHENEVER $AC_POWER>80 DO $AC_OVR=50 (halve feed when spindle power exceeds 80%). Tool breakage detection: ID=2 WHEN $AC_POWER<5 DO SETAL(61000) (alarm if power drops during cutting). Thermal compensation via axis offsets: $AA_OFF[X]=<value> applied from PLC-computed temperature data. These variables, combined with synchronized actions, enable sophisticated in-process monitoring without external hardware. The variable set is identical across 840D sl, 828D, and SINUMERIK ONE, though some drive-level variables require specific SINAMICS firmware versions.

## Applies to

- Operation types: `adaptive_milling`

## Related tips

- [[ctrl-017|Siemens synchronized actions for real-time monitoring]] _(category+op:1+tag:5)_
- [[ctrl-176|Mazak Matrix vs Smooth vs 640MT controller — key programming differences]] _(category+op:1+tag:2)_
- [[ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]] _(category+op:1+tag:2)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:1+tag:1)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:1+tag:1)_

## Tags

#controller #siemens #system-variables #adaptive-machining #monitoring #synchronized-actions #spindle-load #operation-adaptive_milling #controller-siemens
