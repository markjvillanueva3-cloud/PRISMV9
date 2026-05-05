---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-129
title: Hurco WinMax axis clamp M-codes for rotary axes
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m12", "m32", "m34", "axis-clamp", "rotary", "3+2", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: 0000222170b8096fcf6d7e1594b71a1a6ec36a6a142d10c8c449b3333d583e56
mirror_ts: 2026-05-05T13:36:01.527Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax axis clamp M-codes for rotary axes

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:winmax_intro_workbook`

## Tip

WinMax uses M12/M13 for C-axis clamp/unclamp, M32/M33 for A-axis, M34/M35 for B-axis. Always clamp rotary axes after positioning for 3+2 work to prevent creep from cutting forces. Sequence: G0 A45 (position), M32 (clamp A), then cut. Unclamp before next rotary move. Some machines have hydraulic clamps that require dwell (G4 P500) after clamp command. Check machine spec — pneumatic clamps typically instant, hydraulic need 0.5-1s settle time.

## Related tips

- [[ctrl-142|Hurco G68.2 Transform Plane for 3+2 positioning]] _(category+tag:4)_
- [[ctrl-213|Hurco WinMax G68.2 — transform plane enables TCPM and does NOT command movement]] _(category+tag:4)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+tag:4)_
- [[ctrl-124|Hurco WinMax M126/M127 — shortest rotary angle path]] _(category+tag:4)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:3)_

## Tags

#hurco #winmax #m12 #m32 #m34 #axis-clamp #rotary #3-2 #machine-hurco
