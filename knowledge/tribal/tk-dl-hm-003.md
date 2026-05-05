---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-003
title: Clearance plane must be above ALL geometry including fixtures
category: safety
subcategory: coolant_safety
domain: document_learned
knowledge_type: anti_pattern
confidence: 95
source: document:hypermill-manual-en-4@p759
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "clearance-plane", "collision", "rapid", "safety"]
material_groups: []
operation_types: []
content_hash: e6ea1fa99ea896aa3027ff62bfcb6ce3504639e1da247bc8dd63bfd37874dbb5
mirror_ts: 2026-05-05T13:36:00.835Z
mirror_engine: TribalVaultPopulatorEngine
---

# Clearance plane must be above ALL geometry including fixtures

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-manual-en-4@p759`

## Tip

The clearance plane must be situated above ALL workpiece and fixture boundaries in Z direction. Traversing movements at the clearance plane are NOT checked for collisions. A clearance plane set too low will result in rapid-travel crashes into the workpiece or fixtures without any warning from the system.

## Related tips

- [[tk-dl-post-002|Use G01 at high feed instead of G00 for multi-axis rapids — prevents axis stall]] _(category+tag:2)_
- [[tk-012|Safety: never reach into running machine]] _(category+tag:1)_
- [[wedm-kb-028|Safety: never reach into the tank during cutting]] _(category+tag:1)_
- [[wedm-kb-029|Fire risk: maintain water level above workpiece]] _(category+tag:1)_
- [[tk-dl-hm-021|5X tension-release rotations are NOT collision-checked]] _(category+tag:1)_

## Tags

#hypermill #clearance-plane #collision #rapid #safety
