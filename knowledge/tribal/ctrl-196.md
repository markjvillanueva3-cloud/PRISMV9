---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-196
title: Haas G154 P1-P99 extended work offsets — pallet and tombstone programming
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 95
source: controller:haas_ngc_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "g154", "extended-work-offsets", "pallet", "tombstone", "multi-part", "automation", "lights-out", "machine:Haas", "controller:fanuc", "controller:haas"]
material_groups: []
operation_types: []
content_hash: ed56ba946a5dcf2e315d582d0d1ad42db0063e6d27a730c5ffb6447c25df3ac3
mirror_ts: 2026-05-05T13:36:00.869Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G154 P1-P99 extended work offsets — pallet and tombstone programming

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:haas_ngc_programming_manual`

## Tip

Beyond the 6 standard work offsets G54-G59, Haas NGC provides 99 additional work offsets via G154 P1 through G154 P99. These are stored in the same offset table as G54 (G154 P1 = G54 through G154 P6 = G59). G154 P7 through G154 P99 are exclusively accessed via G154. Practical applications: (1) Multi-pallet HMC tombstone with one offset per face (up to 99 faces); (2) Fixture plates with multiple part nests each requiring independent zeroing; (3) Lights-out family-of-parts programs with different part origins per station. Example: G154 P10 (select offset 10). To set via MDI: G154 P10 to activate, then use the standard coordinate system setup procedure. To set offset in program: G10 L2 P10 X<x> Y<y> Z<z> (G10 L2 sets work offset table, P10 = G154 P10 offset number). All 99 offsets support rotation and scaling sub-modifiers when enabled. Limitation: unlike Fanuc G54.1 which goes up to P300, Haas is capped at P99.

## Related tips

- [[ctrl-241|JM Die Haas G154 extended work offsets — multi-operation fixture setups]] _(category+tag:6)_
- [[ctrl-024|Haas NGC unique M-codes reference]] _(category+tag:6)_
- [[ctrl-022|Haas NGC Setting 191 for smoothing tolerance]] _(category+tag:5)_
- [[ctrl-023|Haas macro variables and probing]] _(category+tag:5)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+tag:4)_

## Tags

#haas #ngc #g154 #extended-work-offsets #pallet #tombstone #multi-part #automation #lights-out #machine-haas #controller-fanuc #controller-haas
