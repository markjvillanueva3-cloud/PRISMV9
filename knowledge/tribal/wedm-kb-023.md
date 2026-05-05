---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-023
title: Reduce flush pressure during skim passes
category: speeds_feeds
subcategory: chip_load
domain: process_engineering
knowledge_type: tip
confidence: 88
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "flushing", "skim-pass", "surface-finish", "wire-vibration", "operation:roughing", "operation:finishing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: cf2470630eb125dc88eb3ec0fa0b7390e8c74ca066acbcc679987b3c152d5748
mirror_ts: 2026-05-05T13:36:02.545Z
mirror_engine: TribalVaultPopulatorEngine
---

# Reduce flush pressure during skim passes

**Category:** `speeds_feeds` · **Subcategory:** `chip_load` · **Domain:** `process_engineering`

**Confidence:** `88` · **Source:** `handbook:klocke_2013_ch8`

## Tip

High flush pressure (8-10 bar) is needed for roughing to clear heavy debris. But during skim passes, REDUCE flush to 3-5 bar. High pressure on skim passes causes wire vibration, degrading surface finish. The debris load during skimming is minimal (tiny craters), so aggressive flushing is unnecessary. Some machines have automatic flush pressure scheduling per pass — enable it in the E-pack technology table. This alone can improve skim Ra by 10-15%.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:4)_
- [[wedm-kb-010|Finishing pass wire speed affects Ra consistency]] _(category+op:1+tag:4)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:3)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(category+op:1+tag:3)_
- [[wedm-jmd-008|Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity]] _(category+op:1+tag:2)_

## Tags

#wire-edm #flushing #skim-pass #surface-finish #wire-vibration #operation-roughing #operation-finishing
