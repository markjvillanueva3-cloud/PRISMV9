---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-008
title: JM Die A2 tool steel — slightly faster than D2, same offset cascade
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 90
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "a2", "tool-steel", "punch", "die-shoe", "feed-rate", "rust", "oxidation", "material:P", "material:Steel", "material:A2 Tool Steel", "material:D2 Tool Steel", "operation:roughing", "operation:finishing", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 9e6622653a7a077c7db02275ae7f45298dd3a03679b8062e43839ee7453c36fb
mirror_ts: 2026-05-05T13:36:01.799Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die A2 tool steel — slightly faster than D2, same offset cascade

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `jm_die_production_analysis`

## Tip

A2 tool steel (1.0%C, 5%Cr, 1%Mo) cuts 10-15% faster than D2 on wire EDM due to lower chromium content reducing electrical resistance. At JM Die, A2 is used for larger punches and die shoes where toughness matters more than wear resistance. Use the same E12xx sequences and H-register offsets as D2, but feed rate can be increased — E1221 runs at ~2.3 in/min on 1" A2 vs 2.0 in/min on D2. The HAZ on A2 is slightly smaller, but still run 3+ skim passes. A2 is more prone to rust in the dielectric tank — run finish skims within 24 hours of roughing to avoid surface oxidation between passes.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:8)_
- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:8)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+material:1+op:1+tag:7)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:7)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+material:1+op:1+tag:6)_

## Tags

#wire-edm #jm-die #a2 #tool-steel #punch #die-shoe #feed-rate #rust #oxidation #material-p #material-steel #material-a2-tool-steel #material-d2-tool-steel #operation-roughing #operation-finishing #operation-edm
