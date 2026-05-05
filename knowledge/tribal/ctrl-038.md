---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-038
title: Swiss lathe synchronization between spindles
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: anti_pattern
confidence: 88
source: controller:swiss_lathe_best_practices
created_at: 2026-03-07
usage_count: 0
tags: ["swiss-lathe", "synchronization", "multi-spindle", "star", "tsugami", "citizen", "operation:turning", "machine:Citizen", "machine:Star", "machine:Tsugami"]
material_groups: []
operation_types: ["turning"]
content_hash: 3a4fa32d945645dbc35cbf7ac89c2fe9b8b9a00482531cd5c96265ec98a72d97
mirror_ts: 2026-05-05T13:36:02.220Z
mirror_engine: TribalVaultPopulatorEngine
---

# Swiss lathe synchronization between spindles

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:swiss_lathe_best_practices`

## Tip

On multi-spindle swiss lathes (Citizen, Star, Tsugami): spindle sync uses M-code handshaking. Main spindle sends M200 (wait), sub-spindle responds with M200 (acknowledge). This ensures both streams are at the correct position before cutoff or part transfer. Critical: never skip sync codes or you'll crash the sub-spindle into the main. Star uses $1/$2 stream markers, Tsugami uses T-stream/M-stream.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]] _(category+op:1+tag:4)_
- [[ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]] _(category+op:1+tag:4)_
- [[ctrl-107|Citizen detachable guide bushing and programming impact]] _(category+op:1+tag:4)_
- [[ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]] _(category+op:1+tag:4)_
- [[ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]] _(category+op:1+tag:4)_

## Tags

#swiss-lathe #synchronization #multi-spindle #star #tsugami #citizen #operation-turning #machine-citizen #machine-star #machine-tsugami
