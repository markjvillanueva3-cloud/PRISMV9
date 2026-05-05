---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-008
title: Skim pass count vs Ra: diminishing returns after 4 passes
category: speeds_feeds
subcategory: surface_speed
domain: process_engineering
knowledge_type: heuristic
confidence: 91
source: handbook:toenshoff_edm_ch6
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "surface-finish", "Ra", "skim-pass", "toenshoff", "passes", "operation:roughing", "machine:Makino"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: a0a36b1fdeb0575e2df7ee4391ee4545008a9c6893ac7d01b7d051d8240d509f
mirror_ts: 2026-05-05T13:36:01.414Z
mirror_engine: TribalVaultPopulatorEngine
---

# Skim pass count vs Ra: diminishing returns after 4 passes

**Category:** `speeds_feeds` · **Subcategory:** `surface_speed` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `handbook:toenshoff_edm_ch6`

## Tip

Each skim pass improves Ra by roughly 60-70% (Toenshoff energy cascade: E_n = E_rough × 0.25^(n-1)). Typical progression: Pass 1 (rough) Ra=3.2µm → Skim 1 Ra=1.6µm → Skim 2 Ra=0.8µm → Skim 3 Ra=0.4µm → Skim 4 Ra=0.2µm. After 4 skim passes (5 total), further passes yield <0.05µm improvement — diminishing returns. For Ra<0.2µm, switch to lapping rather than adding more WEDM passes. Published data from Makino U6 confirms this plateau.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-023|Reduce flush pressure during skim passes]] _(category+op:1+tag:4)_
- [[wedm-kb-010|Finishing pass wire speed affects Ra consistency]] _(category+op:1+tag:4)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:3)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(category+op:1+tag:3)_
- [[wedm-kb-012|DC vs AC power supply affects Ra on aluminum]] _(category+op:1+tag:3)_

## Tags

#wire-edm #surface-finish #ra #skim-pass #toenshoff #passes #operation-roughing #machine-makino
