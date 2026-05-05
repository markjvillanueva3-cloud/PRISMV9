---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-002
title: JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224
category: machining
domain: controller_specific
knowledge_type: tip
confidence: 94
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "e12xx", "4-pass", "e1221", "e1222", "e1223", "e1224", "punch", "die", "tool-steel", "material:P", "material:Steel", "material:D2 Tool Steel", "material:S7 Tool Steel", "operation:roughing", "machine:Mitsubishi"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: c3628ad3a14b2e4d0c4ac1f2e5ccb096aec2373556750a070e45f52c5c297d5e
mirror_ts: 2026-05-05T13:36:00.932Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224

**Category:** `machining` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `jm_die_production_analysis`

## Tip

For standard punch and die profiles in tool steel (D2, A2, S7) at 0.5-2.0" thickness, JM Die uses the E12xx standard 4-pass sequence: E1221 (rough, ~0.004" overcut), E1222 (first skim, ~0.002" stock), E1223 (second skim, ~0.0015" stock), E1224 (final skim, <0.001" stock). This achieves Ra 16-20 µin reliably on the Mitsubishi FA-20S. The E1221 roughing pass runs at ~2.0 in/min on 1" D2 steel. Corresponding H-register offsets: H1=0.0085-0.010", H2=0.0064-0.0073", H3=0.0058-0.0059", H4=0.0053-0.0054". This is the workhorse sequence for 60% of JM Die production.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+material:1+op:1+tag:8)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:8)_
- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:8)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:7)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+material:1+op:1+tag:6)_

## Tags

#wire-edm #jm-die #e12xx #4-pass #e1221 #e1222 #e1223 #e1224 #punch #die #tool-steel #material-p #material-steel #material-d2-tool-steel #material-s7-tool-steel #operation-roughing #machine-mitsubishi
