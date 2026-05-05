---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-232
title: JM Die Haas G42/G40 cutter compensation — 2D profiling with automatic radius adjustment
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 96
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "g42", "g41", "g40", "cutter-compensation", "profiling", "d-offset", "lead-in", "operation:profiling", "machine:Haas"]
material_groups: []
operation_types: ["profiling"]
content_hash: d37b44df11ad33bfe6214b03ba9cf81383d834e59dff7b9e4c76d122fad624f2
mirror_ts: 2026-05-05T13:36:00.823Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas G42/G40 cutter compensation — 2D profiling with automatic radius adjustment

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas programs use G42/G41 for profiled cuts: G42 D01 X0. F20. (cutter comp right with D01 diameter offset), then profile moves, then G40 X2.2967 (cancel comp with lead-out move). CRITICAL: G42/G40 must be cancelled with a linear move (G00 or G01), not on an arc (G02/G03). D-number references tool diameter offset table — D01 for T01, etc. The approach move (G42 D01 X0.) must start from outside the profile by at least the cutter radius. JM Die typically uses 0.5-inch lead-in/lead-out distances. For stepped walls: G42/G40 applies to each Z-level separately with new entry/exit moves.

## Applies to

- Operation types: `profiling`

## Related tips

- [[ctrl-022|Haas NGC Setting 191 for smoothing tolerance]] _(category+op:1+tag:4)_
- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category+tag:4)_
- [[ctrl-231|JM Die Haas tool change sequence — M06 with G43 height offset]] _(category+tag:4)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:1+tag:2)_
- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+tag:4)_

## Tags

#jm-die #haas #ngc #g42 #g41 #g40 #cutter-compensation #profiling #d-offset #lead-in #operation-profiling #machine-haas
