---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-003
title: Adaptive control M90 only on rough pass — disable M91 for skims
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: machine_quirk
confidence: 95
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "adaptive-control", "m90", "m91", "mitsubishi", "fa-10s", "rough", "skim", "operation:roughing", "operation:threading", "operation:adaptive_milling", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: c6d4701ed4efd49e31c0d987375ddfda255e1f75e69ca425e088e733559db6bc
mirror_ts: 2026-05-05T13:36:00.887Z
mirror_engine: TribalVaultPopulatorEngine
---

# Adaptive control M90 only on rough pass — disable M91 for skims

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `jm_die_programs`

## Tip

On the Mitsubishi FA-10S at JM Die, Adaptive Control (M90 = on, M91 = off) is used ONLY during the rough cut (Pass 1). The program structure observed in all production programs: M91 (disable AC) is called at program start before threading, M90 (enable AC) is called immediately after the Pass 1 E-code, and subsequent skim passes run without any M90/M91 call — meaning they inherit M91 (off) state. Adaptive control during skimming introduces servo hunting because the low power skim discharge looks like a near-short to the AC algorithm. Running skims with AC on degrades Ra by 10-15% and causes dimensional scatter. Always structure programs: M91 → thread → M90 with E-code Pass 1 → (skims run without M90).

## Applies to

- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]] _(category+op:1+tag:5)_
- [[wedm-web-006|Mitsubishi adaptive control + intelligent power supply + corner control optimizes programming]] _(category+op:1+tag:5)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+tag:6)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+tag:6)_
- [[wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]] _(category+op:1+tag:4)_

## Tags

#wire-edm #adaptive-control #m90 #m91 #mitsubishi #fa-10s #rough #skim #operation-roughing #operation-threading #operation-adaptive_milling #machine-mitsubishi
