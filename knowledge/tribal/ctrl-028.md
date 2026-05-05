---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-028
title: Mazak turning center C-axis and milling M-codes
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:mazak_mill_turn
created_at: 2026-03-07
usage_count: 0
tags: ["mazak", "turning", "c-axis", "milling", "integrex", "live-tool", "operation:turning", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: 5ce6f5807473929d4935d1a2b59677fc6b0c92aefe3be4a135518ea1ed3d2421
mirror_ts: 2026-05-05T13:36:01.524Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak turning center C-axis and milling M-codes

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:mazak_mill_turn`

## Tip

Mazak INTEGREX and QT series with milling: M200 (C-axis clamp), M201 (C-axis unclamp), M33 (live tool spindle CW), M34 (live tool CCW), M35 (live tool stop). G12.1/G13.1 for polar coordinate interpolation (mill features on a turning center). Y-axis milling uses standard G17/G18/G19 plane selection. Always unclamp C-axis (M201) before indexing, clamp (M200) before cutting.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:2+tag:6)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:2+tag:6)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:2+tag:5)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:2+tag:5)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:4)_

## Tags

#mazak #turning #c-axis #milling #integrex #live-tool #operation-turning #operation-milling #machine-mazak
