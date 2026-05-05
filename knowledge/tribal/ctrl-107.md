---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-107
title: Citizen detachable guide bushing and programming impact
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "citizen", "swiss-lathe", "guide-bushing", "detachable", "Z-origin", "operation:turning", "machine:Citizen"]
material_groups: []
operation_types: ["turning"]
content_hash: 02d300c9924ff14c972e3fcf7e79b95b45a92e706c7d1dbbe2577c0210d5b193
mirror_ts: 2026-05-05T13:36:03.991Z
mirror_engine: TribalVaultPopulatorEngine
---

# Citizen detachable guide bushing and programming impact

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Many Citizen Cincom machines (L12, L20) feature a detachable guide bushing. With guide bushing installed, the machine operates as a traditional swiss-type for long/small-diameter parts. When removed, it becomes a fixed-headstock lathe for short workpieces with less material waste. This configuration change affects programming: with guide bushing, Z-axis reference is at the bushing face; without it, reference shifts to the chuck face. Always verify your Z-origin when switching modes. The detachable bushing also changes bar remnant length — non-guide-bushing mode typically saves 30-50mm of bar stock per remnant. Update your bar feeder parameters and part-off positions accordingly.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]] _(category+op:1+tag:5)_
- [[ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]] _(category+op:1+tag:5)_
- [[ctrl-038|Swiss lathe synchronization between spindles]] _(category+op:1+tag:4)_
- [[ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]] _(category+op:1+tag:3)_
- [[ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]] _(category+op:1+tag:3)_

## Tags

#controller #citizen #swiss-lathe #guide-bushing #detachable #z-origin #operation-turning #machine-citizen
