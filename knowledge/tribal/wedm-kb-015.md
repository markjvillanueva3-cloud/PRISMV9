---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-015
title: Maximum practical WEDM thickness depends on wire type
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 88
source: handbook:reliable_edm_ch5
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "thick-section", "wire-diameter", "maximum-thickness", "wire-deflection", "material:N", "material:brass", "operation:edm"]
material_groups: ["N"]
operation_types: ["wire_edm"]
content_hash: 4e13ec29cc35ac038ada4deb9ef29f0c9c7a0a822a1cb32b7230b2dfc66dd90b
mirror_ts: 2026-05-05T13:36:02.544Z
mirror_engine: TribalVaultPopulatorEngine
---

# Maximum practical WEDM thickness depends on wire type

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `88` · **Source:** `handbook:reliable_edm_ch5`

## Tip

Maximum recommended cutting thickness by wire type: 0.20mm brass wire = 100mm, 0.25mm brass wire = 200mm, 0.30mm brass wire = 300mm, 0.25mm coated wire = 250mm. Beyond these limits, wire deflection under discharge force exceeds acceptable tolerance (δ = F×L²/8T where L=thickness). For thicknesses >200mm, consider sinker EDM instead. Practical limit for production: 150mm with 0.25mm wire for repeatability.

## Applies to

- Material groups: `N`
- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+material:1+op:1+tag:4)_
- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+material:1+op:1+tag:3)_
- [[wedm-mcam-005|Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required]] _(category+op:1+tag:4)_
- [[jm-die-012|JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence]] _(category+op:1+tag:4)_
- [[tk-dl-mc-wire-01|Wire EDM overburn decreases per skim pass]] _(category+material:1+tag:4)_

## Tags

#wire-edm #thick-section #wire-diameter #maximum-thickness #wire-deflection #material-n #material-brass #operation-edm
