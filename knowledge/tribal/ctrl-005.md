---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-005
title: Fanuc high-speed peck drilling G73 vs G83
category: programming
domain: controller_specific
knowledge_type: heuristic
confidence: 93
source: controller:fanuc_programming_manual
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "drilling", "g73", "g83", "peck", "cycle-time", "material:P", "material:Steel", "material:M", "material:Stainless Steel", "material:S", "material:Titanium", "operation:drilling", "operation:turning", "operation:hsm", "controller:fanuc"]
material_groups: ["P", "M", "S"]
operation_types: ["drilling", "turning", "hsm"]
content_hash: c31239d268b5f26266c38dee42c32f51426aa7a285b3898614caed4ce725afb4
mirror_ts: 2026-05-05T13:36:00.963Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc high-speed peck drilling G73 vs G83

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:fanuc_programming_manual`

## Tip

G73 (high-speed peck) retracts only a small amount (parameter #5114, typically 1mm) between pecks — much faster than G83 which retracts to R-plane. Use G73 for depths up to 5xD in steel, G83 only for deeper holes or gummy materials (stainless, titanium) where full retract is needed for chip clearing. On Fanuc 0i-TF (turning), G74 is the equivalent peck drilling cycle.

## Applies to

- Material groups: `P`, `M`, `S`
- Operation types: `drilling`, `turning`, `hsm`

## Related tips

- [[esp-080|Chip-Break Drilling for Efficient Chip Evacuation]] _(material:3+op:1+tag:10)_
- [[mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]] _(material:3+op:1+tag:7)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:3+tag:5)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+op:2+tag:4)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+material:1+op:2+tag:4)_

## Tags

#fanuc #drilling #g73 #g83 #peck #cycle-time #material-p #material-steel #material-m #material-stainless-steel #material-s #material-titanium #operation-drilling #operation-turning #operation-hsm #controller-fanuc
