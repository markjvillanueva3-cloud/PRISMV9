---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-014
title: Siemens ShopMill conversational vs G-code programming
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 85
source: controller:siemens_shopmill_guide
created_at: 2026-03-07
usage_count: 0
tags: ["siemens", "shopmill", "conversational", "programming-mode", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: 27e18f286fe5e9b75d90e6d7f19947458ad51e00173e639f9a6bb3ad3dd39060
mirror_ts: 2026-05-05T13:36:03.292Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens ShopMill conversational vs G-code programming

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `85` · **Source:** `controller:siemens_shopmill_guide`

## Tip

SINUMERIK 840D sl supports dual programming modes: ShopMill (graphical/conversational) and G-code (DIN/ISO). ShopMill programs can be converted to G-code but NOT vice versa. For production, use G-code from CAM. For prototypes and simple parts, ShopMill is faster — it auto-generates safe approach/retract moves and handles tool changes. Mixed-mode programs (ShopMill cycles within G-code) work but are not recommended.

## Related tips

- [[ctrl-168|Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code]] _(category+tag:4)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+tag:3)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+tag:2)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+tag:2)_
- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+tag:2)_

## Tags

#siemens #shopmill #conversational #programming-mode #controller-siemens
