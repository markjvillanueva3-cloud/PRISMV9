---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-026
title: Mazak MAZATROL Smooth conversational vs EIA/ISO
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 88
source: controller:mazak_programming_guide
created_at: 2026-03-07
usage_count: 0
tags: ["mazak", "mazatrol", "smooth", "conversational", "eia-iso", "machine:Mazak", "controller:fanuc", "controller:mazak"]
material_groups: []
operation_types: []
content_hash: a673a9d1631ae7f2eba796dd59dd90904e1d839628d38eb855a72bf6663207b0
mirror_ts: 2026-05-05T13:36:02.217Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak MAZATROL Smooth conversational vs EIA/ISO

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:mazak_programming_guide`

## Tip

MAZATROL SmoothAi/X/G support dual programming: MAZATROL conversational and EIA/ISO G-code. MAZATROL programs are proprietary binary — cannot be edited outside the control. For CAM work, always use EIA/ISO mode. Key difference from Fanuc: Mazak's G-code dialect uses G43.4 for RTCP but stores kinematic data differently. Post-processors must use Mazak-specific format, not generic Fanuc.

## Related tips

- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+tag:6)_
- [[tk-dl-mazak-006|Mazatrol auto tool development: multi-drill staging by hole diameter]] _(category+tag:5)_
- [[ctrl-175|Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters]] _(category+tag:5)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+tag:5)_
- [[ctrl-092|MAZATROL conversational vs EIA/ISO — interoperability]] _(category+tag:5)_

## Tags

#mazak #mazatrol #smooth #conversational #eia-iso #machine-mazak #controller-fanuc #controller-mazak
