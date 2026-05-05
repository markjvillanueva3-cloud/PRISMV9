---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-004
title: JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 91
source: jm_die_production_analysis:NOZE_TEST
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "e28xx", "5-pass", "taper", "uv-axis", "4-axis", "e2821", "e2822", "e2823", "e2824", "e2825", "mitsubishi", "fa-20s", "operation:roughing", "operation:adaptive_milling", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 9f687d1fcc7c53149a1d1f4e9119b40cd953f9e6d5faa0320103f6505f335e26
mirror_ts: 2026-05-05T13:36:01.420Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `jm_die_production_analysis:NOZE_TEST`

## Tip

When cutting tapered profiles (common in extrusion die inserts and heading punches), JM Die uses the E28xx taper sequence with UV axis engagement. The E2821-E2825 family is optimized for Mitsubishi FA-20S 4-axis mode where upper and lower profiles differ. Key difference from E12xx: the E28xx roughing pass uses adaptive power compensation (M90 activated) to maintain consistent spark gap as wire angle varies. For tapers >3°, always use E28xx over E12xx. Taper capability: FA-20S supports ±15° in 3" thickness. For complex 3D profiles (different top/bottom shapes), program UV moves explicitly — do not rely on automatic taper compensation for shape differences.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]] _(category+op:1+tag:8)_
- [[jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]] _(category+op:1+tag:7)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+op:1+tag:4)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:4)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+op:1+tag:4)_

## Tags

#wire-edm #jm-die #e28xx #5-pass #taper #uv-axis #4-axis #e2821 #e2822 #e2823 #e2824 #e2825 #mitsubishi #fa-20s #operation-roughing #operation-adaptive_milling #machine-mitsubishi
