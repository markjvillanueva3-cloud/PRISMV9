---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-028
title: Safety: never reach into the tank during cutting
category: safety
subcategory: coolant_safety
domain: safety
knowledge_type: anti_pattern
confidence: 100
source: safety:osha_edm_guidelines
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "safety", "electric-shock", "tank", "interlock"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: c85ede16a95197d327c78676a6c1eb5b476fda55e0a9545a0325a22e64c455c8
mirror_ts: 2026-05-05T13:36:00.794Z
mirror_engine: TribalVaultPopulatorEngine
---

# Safety: never reach into the tank during cutting

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `safety`

**Confidence:** `100` · **Source:** `safety:osha_edm_guidelines`

## Tip

NEVER put hands into the dielectric tank while the machine is cutting. The voltage across the spark gap is 60-120V — not lethal for dry skin, but extremely dangerous with hands submerged in conductive water. Additionally, the wire moves at 10+ m/min and can lacerate skin instantly. Always pause the machine (feedhold, then M00) before reaching in. Keep the tank door interlocks functional — bypassing them is grounds for immediate termination in any reputable shop.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-029|Fire risk: maintain water level above workpiece]] _(category+op:1+tag:2)_
- [[wedm-kb-030|Used wire disposal: metal recycling, not trash]] _(category+op:1+tag:2)_
- [[wedm-ml-007|Counterfactual safe_mode reduces wire breakage by 55% for thick sections (>80mm)]] _(category+op:1+tag:1)_
- [[tk-012|Safety: never reach into running machine]] _(category+tag:1)_
- [[tk-dl-hm-003|Clearance plane must be above ALL geometry including fixtures]] _(category+tag:1)_

## Tags

#wire-edm #safety #electric-shock #tank #interlock
