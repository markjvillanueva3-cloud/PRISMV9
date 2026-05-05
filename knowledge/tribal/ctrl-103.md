---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-103
title: Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "makino", "Fanuc", "Pro6", "ATLM", "G-codes", "operation:hsm", "operation:5_axis", "machine:Makino", "controller:fanuc"]
material_groups: []
operation_types: ["hsm", "5_axis"]
content_hash: a0371c742d7c5ed4e6253dd1215e58ecd7a234d936e8939de138697ed1f317d0
mirror_ts: 2026-05-05T13:36:03.987Z
mirror_engine: TribalVaultPopulatorEngine
---

# Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

The Professional 6 control is built on Fanuc hardware with Windows CE GUI overlay. Standard Fanuc G-codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) all work. Makino-specific enhancements: ATLM (Automatic Tool Length Measurement) via guided on-screen prompts, tilted working plane setup with graphical guidance, and SGI.5 integration for HSM. M-codes above M79 are typically machine-specific — always verify with machine documentation. Pro6 stores up to 3GB of programs (expandable to 20GB), supports MDI recall of last 20 inputs, and allows simultaneous program editing during machining.

## Applies to

- Operation types: `hsm`, `5_axis`

## Related tips

- [[ctrl-118|YCM machining centers with Fanuc — OEM integration notes]] _(category+op:2+tag:4)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:2+tag:3)_
- [[ctrl-039|Mitsubishi M800/M80 high-speed SSS control]] _(category+op:2+tag:3)_
- [[ctrl-040|Fidia C40 5-axis contouring specialization]] _(category+op:2+tag:3)_
- [[ctrl-102|Makino SGI.5 — high-speed micro-block processing for mold finishing]] _(category+op:1+tag:4)_

## Tags

#controller #makino #fanuc #pro6 #atlm #g-codes #operation-hsm #operation-5_axis #machine-makino #controller-fanuc
