---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-009
title: Material affects achievable Ra: hardened steel is better than aluminum
category: speeds_feeds
subcategory: surface_speed
domain: process_engineering
knowledge_type: tip
confidence: 89
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "surface-finish", "Ra", "material", "hardness", "crater", "material:P", "material:Steel", "material:D2 Tool Steel", "material:S7 Tool Steel", "material:N", "material:6061 Aluminum", "material:Aluminum", "material:H", "material:Hardened Steel", "material:Hardened (62 HRC)", "operation:finishing"]
material_groups: ["H", "P", "N", "K"]
operation_types: ["wire_edm"]
content_hash: 76ed5c5a4d02a6a8563dad28c1816016a7263035d2b3e635d754634930eca142
mirror_ts: 2026-05-05T13:36:02.102Z
mirror_engine: TribalVaultPopulatorEngine
---

# Material affects achievable Ra: hardened steel is better than aluminum

**Category:** `speeds_feeds` · **Subcategory:** `surface_speed` · **Domain:** `process_engineering`

**Confidence:** `89` · **Source:** `handbook:klocke_2013_ch8`

## Tip

Counter-intuitively, hardened tool steels (D2, A2, S7 at 58-62 HRC) produce BETTER surface finish in WEDM than soft materials like aluminum 6061. Reason: hard materials produce smaller, more uniform discharge craters. Typical achievable Ra after 4 skim passes: D2 hardened=0.15µm, 304SS=0.25µm, 6061 Al=0.4µm, WC=0.10µm. Klocke (2013) attributes this to the higher melting point and lower thermal conductivity concentrating discharge energy into smaller craters.

## Applies to

- Material groups: `H`, `P`, `N`, `K`
- Operation types: `wire_edm`

## Related tips

- [[ts-149|TopSolid Wire EDM Material Database — Optimized Parameters per Alloy]] _(material:3+op:1+tag:8)_
- [[tk-dl-cnc-007|Flute count by material: Al=2-3, Steel=4, Cast Iron=5-6]] _(material:4+tag:6)_
- [[sc2-057|Skim Cuts for Surface Finish and Dimensional Accuracy]] _(material:2+op:1+tag:7)_
- [[mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]] _(material:2+op:1+tag:7)_
- [[tk-dl-cnc-005|HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM]] _(material:3+tag:7)_

## Tags

#wire-edm #surface-finish #ra #material #hardness #crater #material-p #material-steel #material-d2-tool-steel #material-s7-tool-steel #material-n #material-6061-aluminum #material-aluminum #material-h #material-hardened-steel #material-hardened--62-hrc #operation-finishing
