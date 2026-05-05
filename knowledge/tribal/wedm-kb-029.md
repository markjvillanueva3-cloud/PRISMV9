---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-029
title: Fire risk: maintain water level above workpiece
category: safety
subcategory: coolant_safety
domain: safety
knowledge_type: rule
confidence: 98
source: safety:nfpa_edm_fire_prevention
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "safety", "fire", "water-level", "dielectric", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 823249d50b6ef41992580cb4b631dceb1c26891fd6419ffe0f22fe456ba34f89
mirror_ts: 2026-05-05T13:36:00.801Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fire risk: maintain water level above workpiece

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `safety`

**Confidence:** `98` · **Source:** `safety:nfpa_edm_fire_prevention`

## Tip

Wire EDM dielectric fluid (deionized water) must ALWAYS cover the workpiece during cutting. Exposed sparking above the waterline can ignite dielectric additives, workpiece oil residue, or create explosive hydrogen gas pockets. Monitor the tank level sensor — if the level drops below the workpiece top (pump failure, leak, evaporation), the machine should auto-pause. For submerged mode, maintain at least 25mm water coverage above the top of the workpiece.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-028|Safety: never reach into the tank during cutting]] _(category+op:1+tag:2)_
- [[wedm-kb-030|Used wire disposal: metal recycling, not trash]] _(category+op:1+tag:2)_
- [[wedm-ml-007|Counterfactual safe_mode reduces wire breakage by 55% for thick sections (>80mm)]] _(category+op:1+tag:1)_
- [[tk-012|Safety: never reach into running machine]] _(category+tag:1)_
- [[tk-dl-hm-003|Clearance plane must be above ALL geometry including fixtures]] _(category+tag:1)_

## Tags

#wire-edm #safety #fire #water-level #dielectric #operation-edm
