---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-021
title: 5X tension-release rotations are NOT collision-checked
category: safety
subcategory: coolant_safety
domain: document_learned
knowledge_type: anti_pattern
confidence: 95
source: document:hypermill-cam-v33@p1062
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "5-axis", "tension-release", "collision-safety", "rotary-axis", "v33"]
material_groups: []
operation_types: []
content_hash: 31b0f066f0b0bc298d23a17603142deb48708120201e4d9fdb2605b8162c0ce9
mirror_ts: 2026-05-05T13:36:00.836Z
mirror_engine: TribalVaultPopulatorEngine
---

# 5X tension-release rotations are NOT collision-checked

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-cam-v33@p1062`

## Tip

CRITICAL SAFETY: In hyperMILL 5X machining on machines with non-endless rotary axes, tension-release rotations (axis unwinding) are NOT collision checked. The entire sequence — retract from workpiece, tension-release rotation, and re-approach — is unchecked. OPEN MIND recommends defining toolpaths to avoid tension-release rotations entirely, even if it means splitting geometry into multiple jobs.

## Related tips

- [[tk-dl-hm-020|5X collision avoidance automatically modifies tilt angles]] _(category+tag:3)_
- [[tk-dl-hm-026|3D path compensation requires special postprocessor]] _(category+tag:2)_
- [[tk-dl-hm-032|VMC collision check tolerance must be ≤ half tool diameter]] _(category+tag:2)_
- [[tk-dl-hm-033|NC file approval requires collision check — no exceptions]] _(category+tag:2)_
- [[tk-dl-hm-003|Clearance plane must be above ALL geometry including fixtures]] _(category+tag:1)_

## Tags

#hypermill #5-axis #tension-release #collision-safety #rotary-axis #v33
