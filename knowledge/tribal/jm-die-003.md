---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-003
title: JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285
category: machining
domain: general
knowledge_type: tip
confidence: 92
source: jm_die_production_analysis:FIOCCHI
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "e12xx", "5-pass", "e1281", "e1282", "e1283", "e1284", "e1285", "heavy", "thick", "cannelure", "thread-roll", "material:P", "material:Steel", "operation:profiling", "operation:roughing", "operation:finishing", "operation:threading"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 872be7bce3ba46ab0821133c2f921e6e3f921296d2d2af842d40cc515ea3b15a
mirror_ts: 2026-05-05T13:36:01.198Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285

**Category:** `machining` · **Domain:** `general`

**Confidence:** `92` · **Source:** `jm_die_production_analysis:FIOCCHI`

## Tip

For thicker tool steel (>2" up to 6") and cannelure (thread roll) dies that require superior surface finish, JM Die uses the E12xx heavy 5-pass sequence: E1281-E1285. The E128x family has higher power settings than E122x for roughing but adds a 5th skim pass for better Ra. Typical application: FIOCCHI 38 CAL CANNELURE 30TPI dies requiring <12 µin Ra on the thread profile. The 5th pass adds 8-12 minutes per profile but eliminates manual polishing. Use E128x when: (1) thickness >2.5", (2) Ra requirement <16 µin, (3) customer specified no secondary finishing, or (4) complex profiles where manual polish is difficult.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:6)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+material:1+op:1+tag:6)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:6)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+material:1+op:1+tag:5)_
- [[jm-die-010|JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness]] _(category+material:1+op:1+tag:5)_

## Tags

#wire-edm #jm-die #e12xx #5-pass #e1281 #e1282 #e1283 #e1284 #e1285 #heavy #thick #cannelure #thread-roll #material-p #material-steel #operation-profiling #operation-roughing #operation-finishing #operation-threading
