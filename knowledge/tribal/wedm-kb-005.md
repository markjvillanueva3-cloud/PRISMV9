---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-005
title: Coated wire reduces breaks in carbide and PCD
category: tooling
subcategory: tool_coating
domain: process_engineering
knowledge_type: workaround
confidence: 87
source: handbook:reliable_edm_ch5
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "wire-break", "coated-wire", "carbide", "pcd", "zinc", "material:N", "material:brass"]
material_groups: ["N"]
operation_types: ["wire_edm"]
content_hash: 2ad7a4e0ba220d7f1d63b7201c4dd6a5290f97de508ce9086ced8bed8491ace6
mirror_ts: 2026-05-05T13:36:02.889Z
mirror_engine: TribalVaultPopulatorEngine
---

# Coated wire reduces breaks in carbide and PCD

**Category:** `tooling` · **Subcategory:** `tool_coating` · **Domain:** `process_engineering`

**Confidence:** `87` · **Source:** `handbook:reliable_edm_ch5`

## Tip

When cutting tungsten carbide (WC) or PCD (polycrystalline diamond), use zinc-coated brass wire instead of plain brass. The zinc coating acts as a sacrificial layer, vaporizing during discharge and improving flushing. Typical improvement: 30-50% fewer wire breaks at equivalent cutting speed. Zinc-coated wire costs ~40% more but saves 2-3 hours per job in reduced downtime from breaks. For WC thicker than 30mm, gamma-phase coated wire (e.g., Bedra Megacut Plus) is recommended.

## Applies to

- Material groups: `N`
- Operation types: `wire_edm`

## Related tips

- [[wedm-web-003|Wire diameter range 0.05-0.25mm — brass most common, zinc-coated for corrosion resistance]] _(category+material:1+op:1+tag:3)_
- [[wedm-kb-006|Wire tension monitoring prevents unexpected breaks]] _(material:1+op:1+tag:4)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(material:1+op:1+tag:3)_
- [[tk-dl-hm-080|Shape curvature analysis for radius-based tool selection]] _(category+material:1+tag:1)_
- [[tk-dl-cnc-009|Thread mill diameter must be < 70% of thread diameter]] _(category+material:1+tag:1)_

## Tags

#wire-edm #wire-break #coated-wire #carbide #pcd #zinc #material-n #material-brass
