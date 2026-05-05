---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-014
title: Thick sections need voltage compensation
category: speeds_feeds
subcategory: cutting_parameters
domain: process_engineering
knowledge_type: tip
confidence: 87
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "thick-section", "voltage", "gap-voltage", "servo", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: ed354e251b13969d16ba43dcd93749547478fdcb05e881219c5e18220e336bb0
mirror_ts: 2026-05-05T13:36:02.890Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thick sections need voltage compensation

**Category:** `speeds_feeds` · **Subcategory:** `cutting_parameters` · **Domain:** `process_engineering`

**Confidence:** `87` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

For workpiece thickness >100mm, increase gap voltage by 5-10V above the standard setting. The longer spark gap path through the dielectric has higher electrical resistance, requiring more voltage to maintain stable discharge. Without compensation, the discharge frequency drops and cutting speed decreases more than expected. Mitsubishi FA machines have automatic thickness compensation — enable it via the SV (servo voltage) parameter.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-013|Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)]] _(category+op:1+tag:2)_
- [[wedm-kb-012|DC vs AC power supply affects Ra on aluminum]] _(category+op:1+tag:2)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:1)_
- [[wedm-jmd-008|Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity]] _(category+op:1+tag:1)_
- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:1)_

## Tags

#wire-edm #thick-section #voltage #gap-voltage #servo #machine-mitsubishi
