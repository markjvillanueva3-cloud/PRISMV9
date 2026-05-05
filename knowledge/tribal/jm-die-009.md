---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-009
title: JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 89
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "s7", "shock-resistant", "tool-steel", "punch", "thermal-shock", "micro-crack", "haz", "material:P", "material:Steel", "material:D2 Tool Steel", "material:S7 Tool Steel", "material:H", "material:Hardened (58 HRC)", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 24d6f0e254ca2bd7ddc0c1e90689c4e0e5c6c7ecd844a34788c7b149949040a6
mirror_ts: 2026-05-05T13:36:02.105Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `89` · **Source:** `jm_die_production_analysis`

## Tip

S7 shock-resistant tool steel (0.5%C, 3.25%Cr, 1.4%Mo) is used at JM Die for punches that see impact loading (cold heading, stamping). S7 at 54-58 HRC is more susceptible to thermal shock than D2/A2, leading to subsurface micro-cracks if wire EDM power is too aggressive. On the FA-20S: reduce E1221 power to 85% (vs 100% default), increase OFF time 15%, and use a 4th skim pass even for Ra 20 µin specs. Inspect first article S7 parts with dye penetrant (PT) if micro-cracking is a concern. Signs of excessive HAZ on S7: visible temper colors at cut edge, or surface roughness variation along the cut.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:9)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:8)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:8)_
- [[jm-die-011|JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking]] _(category+material:1+op:1+tag:8)_
- [[wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]] _(category+material:1+op:1+tag:7)_

## Tags

#wire-edm #jm-die #s7 #shock-resistant #tool-steel #punch #thermal-shock #micro-crack #haz #material-p #material-steel #material-d2-tool-steel #material-s7-tool-steel #material-h #material-hardened--58-hrc #operation-edm
