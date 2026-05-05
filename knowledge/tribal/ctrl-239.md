---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-239
title: Mitsubishi Wire EDM glue stop — slug retention for complex profiles
category: programming
subcategory: sub_program
domain: process_engineering
knowledge_type: rule
confidence: 95
source: shop:jm_die_wire_edm_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "mitsubishi", "wire-edm", "m01", "glue-stop", "slug-retention", "internal-cutout", "operator-pause", "operation:profiling", "operation:finishing", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["profiling", "finishing", "edm"]
content_hash: 099518c1f16806f533f35415c490b23d29b6a4449e80554c916eeaa405b1a1cf
mirror_ts: 2026-05-05T13:36:00.882Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi Wire EDM glue stop — slug retention for complex profiles

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `process_engineering`

**Confidence:** `95` · **Source:** `shop:jm_die_wire_edm_programs`

## Tip

JM Die wire EDM programs use M01 (glue stop) to pause cutting before completing a profile, allowing the operator to glue slugs in place before they fall. Pattern: cut 90% of profile, M01 (Glue Stop), operator applies adhesive/magnets, M78 M78 M80 M82 M84 to restart, complete profile, G40 to exit. Essential for: internal cutouts where falling slug damages finish, thin or delicate slugs that could tilt and short the wire, parts requiring slug inspection before removal. The 4-5 line restart sequence after M01 (tank fill, water, wire, power) is required because machine stops all functions during glue stop.

## Applies to

- Operation types: `profiling`, `finishing`, `edm`

## Related tips

- [[ctrl-204|Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning]] _(category+op:3+tag:5)_
- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:2+tag:4)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:1+tag:5)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:2+tag:3)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:1+tag:5)_

## Tags

#jm-die #mitsubishi #wire-edm #m01 #glue-stop #slug-retention #internal-cutout #operator-pause #operation-profiling #operation-finishing #operation-edm #machine-mitsubishi
