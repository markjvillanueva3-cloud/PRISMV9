---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-116
title: Tsugami opposed gang tool swiss lathe with Fanuc 32i-B
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "tsugami", "swiss-lathe", "fanuc-variant", "opposed-gang", "modular-tooling", "operation:turning", "operation:5_axis", "machine:Tsugami", "controller:fanuc"]
material_groups: []
operation_types: ["turning", "5_axis"]
content_hash: 4fd2536cfcd8af8533ae2c9482edc11c7dd4ed13701e7c7cf53093a9123b63f4
mirror_ts: 2026-05-05T13:36:04.000Z
mirror_engine: TribalVaultPopulatorEngine
---

# Tsugami opposed gang tool swiss lathe with Fanuc 32i-B

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Tsugami swiss lathes use Fanuc controllers (32i-B on SS-series opposed gang, 0i-TF Plus on P-series split slide). The opposed gang tool configuration (SS20, SS26, SS32) allows simultaneous machining on main and sub spindles with deep cutting capability. Key programming consideration: on opposed-slide machines, each slide must be gauged to a given datum before entering tool offsets — use geometry offsets with drawing dimensions, not incremental offsets. The Modular Tool Zone allows easy swapping between rotary tools, indexed holders, and turning holders — document your tool zone configuration in the program header comments for setup reference. Tsugami's software enables rapid programming with minimal training, but for complex parts, use CAM with Tsugami-specific post processors. The B0-series (B0126, B0205, B0206, B0325, B0326) uses either Fanuc 0i-TD or 32i-B depending on axis count.

## Applies to

- Operation types: `turning`, `5_axis`

## Related tips

- [[ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]] _(category+op:2+tag:6)_
- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+op:2+tag:3)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:2)_
- [[ctrl-038|Swiss lathe synchronization between spindles]] _(category+op:1+tag:4)_
- [[ctrl-117|Nakamura-Tome NT Manual Guide i for multitasking programming]] _(category+op:1+tag:4)_

## Tags

#controller #tsugami #swiss-lathe #fanuc-variant #opposed-gang #modular-tooling #operation-turning #operation-5_axis #machine-tsugami #controller-fanuc
