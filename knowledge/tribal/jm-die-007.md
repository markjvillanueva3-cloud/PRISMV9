---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-007
title: JM Die D2 tool steel parameters — optimal for cold heading die cavities
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 93
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "d2", "tool-steel", "cold-heading", "die", "haz", "recast-layer", "carbide", "material:P", "material:Steel", "material:D2 Tool Steel", "material:H", "material:Hardened (62 HRC)", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 056378fdd33ba1a856b8cea9990e097b12b4e5a5f2a4c3ab576d6d09e4d70f73
mirror_ts: 2026-05-05T13:36:01.035Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die D2 tool steel parameters — optimal for cold heading die cavities

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `jm_die_production_analysis`

## Tip

D2 tool steel (1.55%C, 12%Cr, 0.85%Mo) is JM Die's primary material for cold heading die cavities. Wire EDM characteristics: high hardness at 58-62 HRC, excellent wear resistance, but tendency to micro-crack if heat-affected zone (HAZ) is excessive. For D2 on the FA-20S: use E12xx standard at 80% power (reduce from default 100%), increase OFF time by 10% to reduce HAZ, and always run at least 3 skim passes to remove recast layer. Expected cutting rate: 1.8-2.2 in²/hr on 1" stock. Never skip final skim on D2 — the recast layer contains carbide precipitates that accelerate punch wear if left in place.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:9)_
- [[jm-die-010|JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness]] _(category+material:1+op:1+tag:8)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:7)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:7)_
- [[jm-die-011|JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking]] _(category+material:1+op:1+tag:7)_

## Tags

#wire-edm #jm-die #d2 #tool-steel #cold-heading #die #haz #recast-layer #carbide #material-p #material-steel #material-d2-tool-steel #material-h #material-hardened--62-hrc #operation-edm
