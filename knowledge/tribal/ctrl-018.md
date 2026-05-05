---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-018
title: Heidenhain TNC 640 conversational programming (Klartext)
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: heuristic
confidence: 92
source: controller:heidenhain_klartext_guide
created_at: 2026-03-07
usage_count: 0
tags: ["heidenhain", "tnc640", "klartext", "conversational", "programming", "controller:heidenhain"]
material_groups: []
operation_types: []
content_hash: acd3850aed42552fd9784b4dfa856f66a9f6df3a064fb64075563bd40ff95e14
mirror_ts: 2026-05-05T13:36:01.086Z
mirror_engine: TribalVaultPopulatorEngine
---

# Heidenhain TNC 640 conversational programming (Klartext)

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:heidenhain_klartext_guide`

## Tip

The TNC 640 uses Heidenhain's unique Klartext (plain text) programming language — NOT standard G-code. Commands are descriptive: L X+100 Y+50 F500 (linear move), CC X+0 Y+0 (circle center), C X+50 Y+0 DR+ (clockwise arc). While it supports ISO G-code mode (G0, G1, etc.), Klartext is more powerful for manual programming. CAM post-processors for Hermle and Kern typically output Klartext, not ISO.

## Related tips

- [[ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]] _(category+tag:3)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+tag:2)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+tag:2)_
- [[ctrl-020|Heidenhain Dynamic Efficiency for adaptive feed]] _(category+tag:2)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+tag:2)_

## Tags

#heidenhain #tnc640 #klartext #conversational #programming #controller-heidenhain
