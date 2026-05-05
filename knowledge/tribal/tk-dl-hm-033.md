---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-033
title: NC file approval requires collision check — no exceptions
category: safety
domain: document_learned
knowledge_type: anti_pattern
confidence: 95
source: document:hypermill-vmc-v33@p28-29
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "nc-approval", "collision-check", "virtual-machining", "gouge", "v33"]
material_groups: []
operation_types: []
content_hash: afafce24a5514ab50f26813d3630b030b9e2b9329033141b12e4be5e2a4507df
mirror_ts: 2026-05-05T13:36:00.840Z
mirror_engine: TribalVaultPopulatorEngine
---

# NC file approval requires collision check — no exceptions

**Category:** `safety` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-vmc-v33@p28-29`

## Tip

hyperMILL VIRTUAL Machining Center enforces a strict NC approval workflow: NC files are NOT available by default → collision check must run → green button = no collisions (approved) → red = collision/gouge detected (blocked) → yellow = contact/warning (can be overridden). Collision = any element interference (cannot approve). Gouge = cutting area violating part (cannot approve). Contact = permitted tool tip violation within tolerance (can approve with override). A 180° rotation or rotary axis rotation >7.5° also blocks approval.

## Related tips

- [[tk-dl-hm-032|VMC collision check tolerance must be ≤ half tool diameter]] _(category+tag:5)_
- [[tk-dl-hm-021|5X tension-release rotations are NOT collision-checked]] _(category+tag:2)_
- [[tk-dl-hm-026|3D path compensation requires special postprocessor]] _(category+tag:2)_
- [[tk-dl-hm-020|5X collision avoidance automatically modifies tilt angles]] _(category+tag:2)_
- [[tk-dl-hm-029|VT collision check only works for hole machining, not milling]] _(category+tag:2)_

## Tags

#hypermill #nc-approval #collision-check #virtual-machining #gouge #v33
