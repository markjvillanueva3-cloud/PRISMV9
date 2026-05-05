---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-010
title: Finishing pass wire speed affects Ra consistency
category: speeds_feeds
subcategory: cutting_parameters
domain: controller_specific
knowledge_type: tip
confidence: 86
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "surface-finish", "Ra", "wire-speed", "finishing", "operation:roughing", "operation:finishing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 5b1997723d4dc215a6aa410ba3608e82de794b429f3f4de1dfa14909c495e69c
mirror_ts: 2026-05-05T13:36:03.178Z
mirror_engine: TribalVaultPopulatorEngine
---

# Finishing pass wire speed affects Ra consistency

**Category:** `speeds_feeds` · **Subcategory:** `cutting_parameters` · **Domain:** `controller_specific`

**Confidence:** `86` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

During finishing (skim) passes, maintain wire speed at 6-8 m/min for best Ra consistency. Lower wire speed causes the same wire section to receive multiple discharges, creating thermal fatigue marks. Higher speed wastes wire. The wire speed does NOT affect cutting speed — it only affects the wire surface condition presented to the discharge gap. For roughing, wire speed of 10-12 m/min is standard to prevent wire breakage from thermal accumulation.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:4)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(category+op:1+tag:4)_
- [[wedm-kb-023|Reduce flush pressure during skim passes]] _(category+op:1+tag:4)_
- [[wedm-kb-012|DC vs AC power supply affects Ra on aluminum]] _(category+op:1+tag:3)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:2)_

## Tags

#wire-edm #surface-finish #ra #wire-speed #finishing #operation-roughing #operation-finishing
