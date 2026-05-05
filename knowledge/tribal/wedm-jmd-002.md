---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-002
title: Always use double M78 M78 for tank fill on Mitsubishi FA-10S
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: machine_quirk
confidence: 98
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "m78", "tank-fill", "mitsubishi", "fa-10s", "awt", "m-code", "operation:threading", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 83c1646ae95c972e67c85472d2bd2dbdb95bd7716ca7ee477d598f69490205b0
mirror_ts: 2026-05-05T13:36:00.802Z
mirror_engine: TribalVaultPopulatorEngine
---

# Always use double M78 M78 for tank fill on Mitsubishi FA-10S

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `98` · **Source:** `jm_die_programs`

## Tip

On the Mitsubishi FA-10S at JM Die, the Fill Tank command M78 is ALWAYS issued twice in succession (M78 M78) before every cut restart. This is not a typo — a single M78 starts the pump but the FA-10S requires a second M78 to confirm and hold the fill state during re-threading. The double command appears in every production program analyzed (ITW SHAKEPROOF, NOZE TEST, CHOCTAW DEFENSE cannelure) — 100% consistency. Writing only a single M78 causes intermittent 'insufficient fluid' alarms during AWT (Automatic Wire Threading) because the machine checks tank level mid-thread. Always write 'M78 M78' as a unit.

## Applies to

- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]] _(category+op:1+tag:5)_
- [[wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]] _(category+op:1+tag:4)_
- [[wedm-mcam-002|Makino DUO: M17 compound code replaces separate thread/tank/flush sequence]] _(category+op:1+tag:4)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+tag:5)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:3)_

## Tags

#wire-edm #m78 #tank-fill #mitsubishi #fa-10s #awt #m-code #operation-threading #machine-mitsubishi
