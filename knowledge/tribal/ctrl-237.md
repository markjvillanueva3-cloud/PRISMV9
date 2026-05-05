---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-237
title: Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control
category: programming
subcategory: sub_program
domain: process_engineering
knowledge_type: tip
confidence: 98
source: shop:jm_die_wire_edm_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "mitsubishi", "wire-edm", "m-codes", "tank-control", "wire-threading", "adaptive-control", "m78", "m20", "operation:threading", "operation:adaptive_milling", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["threading", "adaptive_milling", "edm"]
content_hash: afb3ffac7588a232d69f450cb3ee78bdaa54f6a935fd3038a834edd599f7aba1
mirror_ts: 2026-05-05T13:36:00.800Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `process_engineering`

**Confidence:** `98` · **Source:** `shop:jm_die_wire_edm_programs`

## Tip

JM Die Mitsubishi wire EDM M-code reference: M20 (thread wire through start hole), M21 (cut wire), M78 M78 (fill tank — doubled for confirmation), M58 (drain tank), M80 (dielectric water on), M81 (water off), M82 (wire feed on), M83 (wire feed off), M84 (power on), M85 (power off), M90 (adaptive control on), M91 (adaptive control off). Standard sequence at cut start: M20, M78 M78, M80, M82, M84, M90. At glue stop (M01): cut pauses for slug removal, then M78 M78, M80, M82, M84 to restart. Program end: M85 M83 M81 (all off), M21 (cut wire), M58 (drain tank), M02.

## Applies to

- Operation types: `threading`, `adaptive_milling`, `edm`

## Related tips

- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:3+tag:7)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:6)_
- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:2+tag:4)_
- [[ctrl-238|Mitsubishi Wire EDM E-codes — power settings and pass management]] _(category+op:1+tag:5)_
- [[ctrl-239|Mitsubishi Wire EDM glue stop — slug retention for complex profiles]] _(category+op:1+tag:5)_

## Tags

#jm-die #mitsubishi #wire-edm #m-codes #tank-control #wire-threading #adaptive-control #m78 #m20 #operation-threading #operation-adaptive_milling #operation-edm #machine-mitsubishi
