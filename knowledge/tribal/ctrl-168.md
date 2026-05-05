---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-168
title: Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 89
source: controller:siemens_sinumerik_operate_manual
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "shopmill", "shopturn", "sinumerik-operate", "conversational", "graphical-programming", "hmi", "proc", "cycles", "operation:drilling", "operation:threading", "operation:turning", "operation:milling", "operation:engraving", "controller:siemens"]
material_groups: []
operation_types: ["drilling", "threading", "turning", "milling", "engraving"]
content_hash: 566b2a0adb344c70975b7b2a90220b1eb52a9fd80d4e01eedc9447a8c9f0ef94
mirror_ts: 2026-05-05T13:36:01.820Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `89` · **Source:** `controller:siemens_sinumerik_operate_manual`

## Tip

ShopMill and ShopTurn are Siemens graphical conversational programming interfaces on the SINUMERIK Operate HMI. ShopMill targets milling machining centers; ShopTurn targets turning centers. Key characteristics: (1) Programs created graphically with form-based inputs — no G-code knowledge required for basic operations, (2) ShopMill internally generates PROC-based .mpf and .spf NC files which can be edited as G-code if needed, (3) The graphical representation updates in real-time as parameters change, (4) ShopMill available cycles: drilling CYCLE81-CYCLE89, milling pockets and contours, thread milling, engraving, probing, (5) ShopTurn adds: turning, grooving, threading CYCLE99, parting. Integration: CAM-generated G-code programs run on ShopMill machines without modification. Best practice: use ShopMill for setup-intensive first-article work; use CAM post output for production runs where toolpath optimization matters. ShopMill is standard on all 840D sl and SINUMERIK ONE controllers.

## Applies to

- Operation types: `drilling`, `threading`, `turning`, `milling`, `engraving`

## Related tips

- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:4+tag:7)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:4+tag:5)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:5)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:4+tag:4)_

## Tags

#siemens #840d #shopmill #shopturn #sinumerik-operate #conversational #graphical-programming #hmi #proc #cycles #operation-drilling #operation-threading #operation-turning #operation-milling #operation-engraving #controller-siemens
