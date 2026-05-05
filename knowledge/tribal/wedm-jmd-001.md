---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-001
title: H175 master offset: global trim variable for JM Die Mitsubishi FA-10S
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: rule
confidence: 97
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "h175", "offset", "mastercam", "mitsubishi", "fa-10s", "trim", "die-work", "machine:Mitsubishi"]
material_groups: ["H", "P"]
operation_types: ["wire_edm"]
content_hash: 316561c8289ab3ea952d30621f9dcca719aded1034030834d102c05ff69c2fde
mirror_ts: 2026-05-05T13:36:00.812Z
mirror_engine: TribalVaultPopulatorEngine
---

# H175 master offset: global trim variable for JM Die Mitsubishi FA-10S

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `97` · **Source:** `jm_die_programs`

## Tip

JM Die uses a shop-standard H175 variable as a global master trim offset applied to ALL wire compensation H-registers. The header pattern is: 'H175 = 0.0000' followed by 'H1 = 0.0085 + H175', 'H2 = 0.0064 + H175', etc. This means the operator can adjust ALL pass offsets simultaneously by setting a single value at the machine control — for example, H175 = -0.0002 trims 0.0002 in off every pass without editing individual H values. This is critical for die work where a ±0.0001" adjustment at the machine must propagate to all 4 skim passes. Do NOT hardcode H1=0.0085 without the H175 addend — the operator has no way to trim the part at the machine. Programs without this pattern lock the operator out of fine-tuning.

## Applies to

- Material groups: `H`, `P`
- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]] _(category+op:1+tag:4)_
- [[wedm-jmd-005|UV taper programs: set all H-register offsets to zero]] _(category+op:1+tag:4)_
- [[wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]] _(category+op:1+tag:4)_
- [[wedm-mcam-001|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]] _(category+material:1+op:1+tag:2)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:4)_

## Tags

#wire-edm #h175 #offset #mastercam #mitsubishi #fa-10s #trim #die-work #machine-mitsubishi
