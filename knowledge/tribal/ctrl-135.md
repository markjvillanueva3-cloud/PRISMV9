---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-135
title: Hurco WinMax G16 polar coordinate mode for bolt patterns
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 90
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "g16", "g15", "polar", "bolt-circle", "hole-pattern", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: 9251ad03986b9fb7648a7f4c9ee782fe560490bdfd794216cedf9baf2d2acbfc
mirror_ts: 2026-05-05T13:36:01.530Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax G16 polar coordinate mode for bolt patterns

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:winmax_intro_workbook`

## Tip

G16 enables polar coordinate mode — X becomes radius, Y becomes angle. Perfect for bolt circles without calculating XY positions: G16 (polar on), G81 X1.5 Y0 Z-0.5 R0.1 F10 (hole at radius 1.5, 0°), Y45 (hole at 45°), Y90 (hole at 90°), etc. G15 returns to Cartesian. Polar mode works with canned cycles and linear moves. The angle origin (Y0) is along positive X-axis. Use incremental mode (G91) for evenly-spaced holes: G91 Y30 L12 (12 holes at 30° spacing).

## Related tips

- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:3)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+tag:3)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+tag:3)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+tag:3)_
- [[ctrl-142|Hurco G68.2 Transform Plane for 3+2 positioning]] _(category+tag:3)_

## Tags

#hurco #winmax #g16 #g15 #polar #bolt-circle #hole-pattern #machine-hurco
