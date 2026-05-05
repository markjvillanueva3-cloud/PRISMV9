---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-017
title: JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling
category: machining
domain: general
knowledge_type: tip
confidence: 94
source: jm_die_production_analysis:ITW_SHAKEPROOF
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "itw-shakeproof", "fastener", "punch", "4-pass", "benchmark", "d2", "material:P", "material:Steel", "material:D2 Tool Steel", "operation:profiling", "operation:roughing", "operation:adaptive_milling"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 8ace34d6c53a2690a1c1ed7590c2cca7b8096bde65d01d5d539a63d0a3133a79
mirror_ts: 2026-05-05T13:36:00.933Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling

**Category:** `machining` · **Domain:** `general`

**Confidence:** `94` · **Source:** `jm_die_production_analysis:ITW_SHAKEPROOF`

## Tip

ITW SHAKEPROOF is a high-volume JM Die customer producing fastener heading tooling. Standard program pattern: 4-pass E1221-E1224, H175 master offset at 0.0089", H1-H4 cascade (0.0085/0.0068/0.0059/0.0054), M90 adaptive on rough/first skim. Typical part: punch profile, 0.75-1.5" D2 steel, ±0.0005" tolerance, Ra 20 µin. This pattern achieves 95% quality score and serves as the benchmark for standard punch work. When AI optimizes an amateur program, it should converge toward this pattern for similar part/material combinations.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:8)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:7)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:6)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+material:1+op:1+tag:6)_
- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:6)_

## Tags

#wire-edm #jm-die #itw-shakeproof #fastener #punch #4-pass #benchmark #d2 #material-p #material-steel #material-d2-tool-steel #operation-profiling #operation-roughing #operation-adaptive_milling
