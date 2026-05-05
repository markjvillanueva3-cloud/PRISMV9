---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-238
title: Mitsubishi Wire EDM E-codes — power settings and pass management
category: programming
subcategory: sub_program
domain: process_engineering
knowledge_type: tip
confidence: 96
source: shop:jm_die_wire_edm_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "mitsubishi", "wire-edm", "e-codes", "power-settings", "skim-pass", "g41", "g42", "wire-offset", "operation:roughing", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["roughing", "edm"]
content_hash: 8296cd369e5f7410d1d54071f235cbb46a0018afd4f4145e94bdf4e56da0c8cd
mirror_ts: 2026-05-05T13:36:00.826Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi Wire EDM E-codes — power settings and pass management

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `process_engineering`

**Confidence:** `96` · **Source:** `shop:jm_die_wire_edm_programs`

## Tip

JM Die Mitsubishi E-codes control EDM power: E1221 H1 F.12 (PASS=1) — E1221 is power condition code from technology database, H1 is offset variable, F.12 is wire feed rate. Each pass uses different E-code: E1221 (rough/1st pass), E1222 (2nd skim), E1223 (3rd skim), E1224 (4th/final skim). Higher E-code numbers generally have finer settings. The F-value decreases with passes: F.12 → F.24 → F.21 → F.2. Wire offset (G41/G42) applies H-variable: G42 G1 X-.20265 Y.117 uses current H offset. Direction alternates: odd passes use G42 (right), even passes use G41 (left) for consistent corner quality.

## Applies to

- Operation types: `roughing`, `edm`

## Related tips

- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:2+tag:7)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:1+tag:5)_
- [[ctrl-239|Mitsubishi Wire EDM glue stop — slug retention for complex profiles]] _(category+op:1+tag:5)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:1+tag:5)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+tag:6)_

## Tags

#jm-die #mitsubishi #wire-edm #e-codes #power-settings #skim-pass #g41 #g42 #wire-offset #operation-roughing #operation-edm #machine-mitsubishi
