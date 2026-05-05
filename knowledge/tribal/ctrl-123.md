---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-123
title: Hurco WinMax G84.2/G84.3 dual Z-word peck tapping
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 95
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "g84.2", "g84.3", "peck-tapping", "rigid-tapping", "dual-z", "isnc", "operation:tapping", "operation:threading", "machine:Hurco"]
material_groups: []
operation_types: ["tapping", "threading"]
content_hash: 872ab5158ad6b51ab12661ac5095cf68829348de3a8f93f261f753eb4a66a74f
mirror_ts: 2026-05-05T13:36:00.859Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax G84.2/G84.3 dual Z-word peck tapping

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:winmax_intro_workbook`

## Tip

WinMax ISNC mode supports peck rigid tapping with G84.2 (right-hand) and G84.3 (left-hand). Unique syntax requires TWO Z-words: first Z is total depth, second Z is peck increment. Example: G84.2 X0 Y0 Z-1.0 Z0.25 R0.1 F41.667 (1 inch depth, 0.25 inch pecks for 1/4-20 at 1000 RPM). This dual Z-word syntax is unique to WinMax and causes post processor issues if not handled correctly. The peck breaks chips but doesn't fully retract, maintaining thread engagement.

## Applies to

- Operation types: `tapping`, `threading`

## Related tips

- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+op:1+tag:5)_
- [[ctrl-148|Hurco BNC vs ISNC mode detection on machine]] _(category+op:1+tag:5)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:3)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:1+tag:4)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:1+tag:4)_

## Tags

#hurco #winmax #g84-2 #g84-3 #peck-tapping #rigid-tapping #dual-z #isnc #operation-tapping #operation-threading #machine-hurco
