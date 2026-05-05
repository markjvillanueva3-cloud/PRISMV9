---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-003
title: Wire break recovery: re-thread 2mm behind break point
category: troubleshooting
subcategory: crash_recovery
domain: controller_specific
knowledge_type: anti_pattern
confidence: 88
source: handbook:sodick_operation_manual
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "wire-break", "recovery", "re-thread", "awt", "operation:threading", "machine:Sodick", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: a061e9e7ddaac5f18d5311748a3936890a7fafda513825b5f6f699c812fec6a9
mirror_ts: 2026-05-05T13:36:02.542Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire break recovery: re-thread 2mm behind break point

**Category:** `troubleshooting` · **Subcategory:** `crash_recovery` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `handbook:sodick_operation_manual`

## Tip

After a wire break, re-thread the wire 2-3mm behind the break point and restart. Do NOT restart from the exact break location — debris and recast layer at the break point cause immediate re-break. Most Mitsubishi and Sodick machines have automatic wire re-threading (AWT) but set the backup distance in the controller parameters. For production: set auto-retry count to 3 with 2mm backup. If it breaks 3 times at the same location, the machine should alarm and notify the operator.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-002|Wire breaks at corners: slow feed + increase OFF time]] _(category+op:1+tag:3)_
- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category+op:1+tag:2)_
- [[wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]] _(category+op:1+tag:2)_
- [[wedm-kb-001|Wire breakage: reduce power before increasing tension]] _(category+op:1+tag:2)_
- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+op:1+tag:2)_

## Tags

#wire-edm #wire-break #recovery #re-thread #awt #operation-threading #machine-sodick #machine-mitsubishi
