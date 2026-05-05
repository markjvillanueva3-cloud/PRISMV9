---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-022
title: Max angle increment must match controller RTCP capability
category: setup
subcategory: zero_setting
domain: document_learned
knowledge_type: rule
confidence: 93
source: document:hypermill-cam-v33@p1061
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "5-axis", "angle-increment", "rtcp", "controller", "interpolation", "v33"]
material_groups: []
operation_types: []
content_hash: 18c0ce9c4120c0331badf5ba6d1ed9fdc634bfbc34a405154d9d0557edd914a9
mirror_ts: 2026-05-05T13:36:00.940Z
mirror_engine: TribalVaultPopulatorEngine
---

# Max angle increment must match controller RTCP capability

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:hypermill-cam-v33@p1061`

## Tip

In hyperMILL 5X cycles, the max angle increment parameter restricts the permissible tool inclination change between two points. This value AND the max G1 segment length depend on the interpolation capability of the controller's RTCP (or equivalent) function. Setting this too high for the controller causes jerky motion or crashes. Consult controller docs for interpolation limits.

## Related tips

- [[tk-dl-hm-070|Workplane On Face for 5-axis setups]] _(category+tag:2)_
- [[tk-dl-hm-034|CONNECTED Machining performs consistency checks before NC transfer]] _(category+tag:2)_
- [[tk-dl-hm-038|Boundary tool reference modes: Past avoids nose-diving in cavities]] _(category+tag:2)_
- [[tk-dl-hm-025|hyperMILL Python API job type codes for CAM automation]] _(category+tag:2)_
- [[tk-dl-hm-035|VMC axis analysis detects unusual movements before machine run]] _(category+tag:2)_

## Tags

#hypermill #5-axis #angle-increment #rtcp #controller #interpolation #v33
