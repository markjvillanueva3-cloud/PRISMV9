---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-012
title: JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 92
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "tungsten-carbide", "wc", "wc-co", "zinc-coated", "e952", "e56xx", "acu", "cobalt", "material:P", "material:Steel", "material:N", "material:brass", "operation:roughing", "operation:edm"]
material_groups: ["K"]
operation_types: ["wire_edm"]
content_hash: c943b9283d9f5ff553746182b78502b4fe05f97e34854a79e4b1132cdf180d1c
mirror_ts: 2026-05-05T13:36:01.199Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `92` · **Source:** `jm_die_production_analysis`

## Tip

Tungsten carbide (WC-Co, 6-15% cobalt) is used at JM Die for wear-critical die inserts and forming tools. Wire EDM of WC on the FA-20S requires: (1) zinc-coated brass wire (not plain brass) — the zinc coating prevents wire breakage in the high-energy rough cut, (2) E952 ACU roughing followed by E56xx ACU skim sequence (E5621-E5622-E5623 or E5627), (3) reduced flushing pressure (4 bar vs 6 bar for steel) to prevent wire deflection in the harder kerf. Cutting rate is 40-50% of steel due to WC's low electrical conductivity. Always run 4+ skim passes on WC — the cobalt binder melts preferentially during EDM, creating a cobalt-depleted surface layer that must be removed.

## Applies to

- Material groups: `K`
- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-005|Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required]] _(category+op:1+tag:8)_
- [[wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]] _(category+material:1+op:1+tag:6)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+op:1+tag:6)_
- [[jm-die-010|JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness]] _(category+op:1+tag:6)_
- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+op:1+tag:6)_

## Tags

#wire-edm #jm-die #tungsten-carbide #wc #wc-co #zinc-coated #e952 #e56xx #acu #cobalt #material-p #material-steel #material-n #material-brass #operation-roughing #operation-edm
