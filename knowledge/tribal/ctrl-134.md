---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-134
title: Hurco WinMax scaling and rotation G50/G51/G68/G69
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: heuristic
confidence: 88
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "g50", "g51", "g68", "g69", "scaling", "rotation", "parametric", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: 8620df5699e3a8af620b0d71e2f2e49c041da2bab5ae19dcfdc51b882a25f115
mirror_ts: 2026-05-05T13:36:02.225Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax scaling and rotation G50/G51/G68/G69

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:winmax_intro_workbook`

## Tip

G51 activates scaling with X, Y, Z scale factors: G51 X2.0 Y2.0 Z1.0 (double XY, keep Z). G50 cancels scaling. G68 activates coordinate rotation: G68 X0 Y0 R45 (rotate 45° about X0Y0). G69 cancels rotation. Can be combined for parametric programming — scale a program down to fit different blank sizes, or rotate to machine multiple identical features at angles. Cancel both (G50 G69) before tool changes. Rotation affects all coordinate modes including cutter comp.

## Related tips

- [[ctrl-213|Hurco WinMax G68.2 — transform plane enables TCPM and does NOT command movement]] _(category+tag:4)_
- [[ctrl-214|Hurco WinMax G68.2 stacking — multiple transform planes require separate G69 cancels]] _(category+tag:4)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:3)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+tag:3)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+tag:3)_

## Tags

#hurco #winmax #g50 #g51 #g68 #g69 #scaling #rotation #parametric #machine-hurco
