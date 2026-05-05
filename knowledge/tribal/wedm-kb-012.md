---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-012
title: DC vs AC power supply affects Ra on aluminum
category: speeds_feeds
subcategory: cutting_parameters
domain: controller_specific
knowledge_type: tip
confidence: 83
source: handbook:reliable_edm_ch5
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "surface-finish", "Ra", "aluminum", "power-supply", "dc", "ac", "material:N", "material:Aluminum", "material:copper", "machine:Sodick", "machine:Mitsubishi"]
material_groups: ["N"]
operation_types: ["wire_edm"]
content_hash: 1ca2e34cf2efdc59a9ca8d3965da28ab17abc2264c91fd62388bf351b0257f83
mirror_ts: 2026-05-05T13:36:03.768Z
mirror_engine: TribalVaultPopulatorEngine
---

# DC vs AC power supply affects Ra on aluminum

**Category:** `speeds_feeds` · **Subcategory:** `cutting_parameters` · **Domain:** `controller_specific`

**Confidence:** `83` · **Source:** `handbook:reliable_edm_ch5`

## Tip

For aluminum and copper alloys, AC-type power supplies produce 20-30% better Ra than DC. The alternating polarity prevents material buildup on the wire (DC causes aluminum to plate onto the wire surface, degrading discharge uniformity). Mitsubishi FA series and Sodick AQ series have switchable DC/AC modes. If your machine is DC-only and cutting aluminum, reduce ON time by 15% and increase OFF time by 20% to partially compensate.

## Applies to

- Material groups: `N`
- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(category+material:1+op:1+tag:5)_
- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:3)_
- [[wedm-kb-010|Finishing pass wire speed affects Ra consistency]] _(category+op:1+tag:3)_
- [[tk-006|Aluminum face mill chatter fix]] _(category+material:1+tag:3)_
- [[f360-193|Aluminum High-Speed Machining Parameters]] _(category+material:1+tag:3)_

## Tags

#wire-edm #surface-finish #ra #aluminum #power-supply #dc #ac #material-n #material-aluminum #material-copper #machine-sodick #machine-mitsubishi
