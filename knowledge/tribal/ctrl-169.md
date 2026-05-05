---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-169
title: Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: tip
confidence: 93
source: controller:mazak_qtu200m_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "mazatrol", "eia", "conversational", "iso", "mill-turn", "g-code", "programming-mode", "operation:pocketing", "operation:threading", "operation:turning", "operation:milling", "machine:Mazak", "controller:fanuc", "controller:mazak"]
material_groups: []
operation_types: ["pocketing", "threading", "turning", "milling"]
content_hash: 4ea86eeb76227b133ee1e954fc5161394bde06b07369905b13def8bf5cfa6adf
mirror_ts: 2026-05-05T13:36:00.971Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `93` · **Source:** `controller:mazak_qtu200m_cps_rev44199`

## Tip

Mazak Mazatrol controllers support two programming modes: Mazatrol conversational (the native language) and EIA/ISO mode (Fanuc-compatible G-code). In Mazatrol conversational, each unit describes the feature to be machined (e.g., HOLE, FACE, POCKET) and the control calculates tool paths internally — parameters are entered in plain language with pick-based menus. EIA mode uses standard G-code compatible with CAM post processors; the Fusion 360 Mazak posts output EIA (file extension .eia). Key differences: (1) Tool numbers — Mazatrol uses its own tool table with entries like T01.1 (station.tool); EIA mode uses standard T__ with M06. (2) Threading — Mazatrol generates threading automatically from feature parameters; EIA requires G92/G76 (QTU) or G292/G276 (Integrex). (3) The Fusion QTU post has property isoModeOrMazatrol — setting to Mazatrol outputs a Mazatrol subprogram call for tool and offset setup while the rest of the program is EIA. For complex mill-turn operations, EIA from Fusion gives more predictable toolpaths; Mazatrol conversational is preferred for simple turned parts programmed at the machine.

## Applies to

- Operation types: `pocketing`, `threading`, `turning`, `milling`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:9)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:4+tag:7)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:4+tag:5)_
- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:3+tag:4)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:3+tag:4)_

## Tags

#mazak #mazatrol #eia #conversational #iso #mill-turn #g-code #programming-mode #operation-pocketing #operation-threading #operation-turning #operation-milling #machine-mazak #controller-fanuc #controller-mazak
