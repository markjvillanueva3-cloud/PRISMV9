---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-037
title: Citizen Cincom Swiss lathe guide bushing programming
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 87
source: controller:citizen_cincom_manual
created_at: 2026-03-07
usage_count: 0
tags: ["citizen", "cincom", "swiss-lathe", "guide-bushing", "programming", "operation:turning", "machine:Citizen", "machine:Mitsubishi"]
material_groups: []
operation_types: ["turning"]
content_hash: f7b864fec630a2848e915cfe9f88d8aaaf262ed0ad48104f112ae8f69b00db33
mirror_ts: 2026-05-05T13:36:02.603Z
mirror_engine: TribalVaultPopulatorEngine
---

# Citizen Cincom Swiss lathe guide bushing programming

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `87` · **Source:** `controller:citizen_cincom_manual`

## Tip

Citizen swiss lathes with Cincom/Mitsubishi M70V control: guide bushing mode is controlled by machine parameter, not G-code. Z-axis moves the headstock (bar feeder), not the tool. B-axis gang slide and rotary tools have separate coordinate systems. Key: always program in terms of the part, the control handles guide bushing compensation. Program structure: main spindle block + sub spindle block, synchronized via M-code handshaking.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-107|Citizen detachable guide bushing and programming impact]] _(category+op:1+tag:5)_
- [[ctrl-038|Swiss lathe synchronization between spindles]] _(category+op:1+tag:4)_
- [[ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]] _(category+op:1+tag:4)_
- [[ctrl-206|Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences]] _(category+op:1+tag:2)_
- [[ctrl-048|Traub TX8i-s V8 swiss lathe programming]] _(category+op:1+tag:2)_

## Tags

#citizen #cincom #swiss-lathe #guide-bushing #programming #operation-turning #machine-citizen #machine-mitsubishi
