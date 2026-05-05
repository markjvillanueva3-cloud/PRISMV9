---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-008
title: Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity
category: speeds_feeds
subcategory: surface_speed
domain: process_engineering
knowledge_type: rule
confidence: 92
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "defense", "ammo", "cannelure", "e12xx", "e1281", "rough-feed", "thread", "closely-spaced", "operation:profiling", "operation:roughing", "operation:threading"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: e3477f26d223501738af66f749c1bc090f1a786b65995547611f1f1b7db90ad6
mirror_ts: 2026-05-05T13:36:01.195Z
mirror_engine: TribalVaultPopulatorEngine
---

# Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity

**Category:** `speeds_feeds` · **Subcategory:** `surface_speed` · **Domain:** `process_engineering`

**Confidence:** `92` · **Source:** `jm_die_programs`

## Tip

JM Die's programs for defense and ammunition tooling (Choctaw Defense cannelure, Fiocchi .38-caliber dies, dated 2016) consistently use the E12xx heavy 5-pass family (E1281-E1285) with a very slow rough feed of F0.06 ipm (1.52 mm/min) — half the standard F0.12 rough feed. The 5 H-register offsets are: H1=0.00995, H2=0.00725, H3=0.00585, H4=0.00535, H5=0.0052 (all + H175). The slow rough pass is mandatory because the thread/cannelure profile has closely-spaced features (~0.033" pitch) where debris from one groove can short the discharge into the adjacent groove. At normal F0.12 rough speed, secondary discharge destroys thread root geometry. For any WEDM work with features spaced closer than 3× the wire diameter, reduce rough feed to F0.06 and increase to standard speed only after Pass 2 clears the initial recast.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(material:1+op:1+tag:7)_
- [[wedm-jmd-007|Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form]] _(material:1+op:1+tag:6)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:3)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(category+material:1+op:1+tag:1)_
- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:2)_

## Tags

#wire-edm #defense #ammo #cannelure #e12xx #e1281 #rough-feed #thread #closely-spaced #operation-profiling #operation-roughing #operation-threading
