---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-007
title: Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 91
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "cannelure", "thread", "arc", "g2", "g3", "defense", "ammo", "die-steel", "fastener", "operation:finishing", "operation:threading", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 8d71c89070a1fe4080d1bf9c95f5b41df7ad446b5c3d8bb2457c2d4e51ba6a4e
mirror_ts: 2026-05-05T13:36:01.418Z
mirror_engine: TribalVaultPopulatorEngine
---

# Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `jm_die_programs`

## Tip

JM Die uses Wire EDM to cut cannelure grooves and thread profiles in hardened die steels — a specialty technique for ammo/fastener tooling (Choctaw Defense, Fiocchi). The pattern: the thread form is approximated as alternating short G2 (CW arc) and G3 (CCW arc) segments for the thread radius, with G1 linear segments for the thread flanks. For a 30 TPI cannelure at ~0.0333" pitch: G1 flank approach → G2 X... I-.00206 J.00218 (CW arc, ~0.003" radius) → G1 X... (next flank) → G3 X... I0. J.003 (CCW arc back) → repeat. The pass 1 uses G2 for one arc direction, pass 2 reverses to G3 — this alternation prevents residual material on one flank. Key insight: the arc radius (~0.003") is sized to the wire diameter (0.010") plus desired root radius. For defense/aerospace customers this technique eliminates hand-finishing of thread roots.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+material:1+op:1+tag:4)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:3)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+material:1+op:1+tag:2)_
- [[wedm-mcam-005|Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required]] _(category+material:1+op:1+tag:2)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:2)_

## Tags

#wire-edm #cannelure #thread #arc #g2 #g3 #defense #ammo #die-steel #fastener #operation-finishing #operation-threading #operation-edm
