---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-010
title: JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 88
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "m2", "high-speed-steel", "hss", "carbide", "recast-layer", "temper", "surface-hardness", "material:P", "material:Steel", "material:H", "material:Hardened (65 HRC)", "operation:roughing", "operation:hsm", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: a2d60e22e603e45ccee5cf0cf8431d76d76fb2acef028209ea25461bafb1414a
mirror_ts: 2026-05-05T13:36:02.548Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `88` · **Source:** `jm_die_production_analysis`

## Tip

M2 high-speed steel (0.85%C, 4%Cr, 5%Mo, 6%W, 2%V) at 60-65 HRC is used at JM Die for forming punches and extrusion tooling. Despite high hardness, M2 cuts well on wire EDM due to good electrical conductivity from tungsten/molybdenum carbides. On FA-20S: E12xx standard at full power (100%), no derating needed. However, M2's surface hardness is affected by EDM recast — the recast layer loses the secondary hardening from carbide precipitation. Always use 4+ skim passes on M2 to fully remove recast layer. After wire EDM, M2 parts often receive a light temper (400-450°F for 1 hour) to restore surface hardness.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:8)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:6)_
- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:6)_
- [[jm-die-011|JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking]] _(category+material:1+op:1+tag:6)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+material:1+op:1+tag:5)_

## Tags

#wire-edm #jm-die #m2 #high-speed-steel #hss #carbide #recast-layer #temper #surface-hardness #material-p #material-steel #material-h #material-hardened--65-hrc #operation-roughing #operation-hsm #operation-edm
