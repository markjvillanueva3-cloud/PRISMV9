---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-005
title: HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM
category: speeds
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:cnc-feeds-speeds-guide@ch3
created_at: 2026-03-03
usage_count: 0
tags: ["sfm", "hss", "surface-speed", "material", "baseline", "material:P", "material:1018 Steel", "material:Steel", "material:D2 Tool Steel", "material:M", "material:303 Stainless", "material:Stainless Steel", "material:K", "material:Cast Iron", "material:N", "material:6061 Aluminum", "material:Aluminum", "material:Brass", "material:S", "material:Titanium"]
material_groups: ["P", "M", "K", "N", "S"]
operation_types: []
content_hash: 216d024169d2509b91b22ea4f10d99e98a0f6be4faf5d37fb94b35b742a9a3ab
mirror_ts: 2026-05-05T13:36:03.198Z
mirror_engine: TribalVaultPopulatorEngine
---

# HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM

**Category:** `speeds` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cnc-feeds-speeds-guide@ch3`

## Tip

HSS baseline surface speeds (SFM): Aluminum 6061=250, Brass=200, Bronze=100, Cast Iron=80, Mild Steel (1018)=110, Alloy Steel (4140)=80, Tool Steel (D2)=60, Stainless 303=45, Stainless 316=30, Titanium 6Al-4V=50. Carbide tooling runs 3-4× these values. Always start at 80% and increase.

## Applies to

- Material groups: `P`, `M`, `K`, `N`, `S`

## Related tips

- [[mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]] _(material:5+tag:9)_
- [[ts-074|Cutting Data Per Material for Automatic Speed/Feed]] _(material:4+tag:9)_
- [[wnc-155|Waveform Roughing — Constant Engagement Angle for Maximum MRR]] _(material:4+tag:8)_
- [[wnc-077|Cutting Data Database Stores Material-Specific Parameters]] _(material:4+tag:8)_
- [[esp-080|Chip-Break Drilling for Efficient Chip Evacuation]] _(material:4+tag:8)_

## Tags

#sfm #hss #surface-speed #material #baseline #material-p #material-1018-steel #material-steel #material-d2-tool-steel #material-m #material-303-stainless #material-stainless-steel #material-k #material-cast-iron #material-n #material-6061-aluminum #material-aluminum #material-brass #material-s #material-titanium
