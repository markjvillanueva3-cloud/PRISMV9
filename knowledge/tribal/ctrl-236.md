---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-236
title: Mitsubishi Wire EDM program structure — multi-pass with offset variables
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: tip
confidence: 97
source: shop:jm_die_wire_edm_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "mitsubishi", "wire-edm", "multi-pass", "offset-variables", "h-variables", "skim-pass", "program-structure", "operation:roughing", "operation:threading", "operation:adaptive_milling", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["roughing", "threading", "adaptive_milling", "edm"]
content_hash: 9e18e998797a945d1782ba80344015231df88dfd70aab323d7f12c9f1bc3050c
mirror_ts: 2026-05-05T13:36:00.811Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi Wire EDM program structure — multi-pass with offset variables

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `97` · **Source:** `shop:jm_die_wire_edm_programs`

## Tip

JM Die Mitsubishi wire EDM programs follow this structure: (1) % start, L001 (program number), date comment, (2) Offset variables: H175 = 0.0000 (master offset for fine tuning), H1 = .0085 + H175, H2 = .0064 + H175, H3 = .0058 + H175, H4 = .0053 + H175 (decreasing offsets for 4 passes), (3) Setup: G90, M91 (adaptive control off), G92 X0 Y0 (set origin), (4) Thread wire: M20, (5) Tank fill: M78 M78, M80 (water on), M82 (wire on), M84 (power on), (6) Power settings per pass: E1221 H1 F.12 (PASS=1). The H-variable system allows fine-tuning all passes by adjusting only H175. Typical 4-pass strategy: rough cut, then 3 skim passes with decreasing offsets.

## Applies to

- Operation types: `roughing`, `threading`, `adaptive_milling`, `edm`

## Related tips

- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:3+tag:7)_
- [[ctrl-238|Mitsubishi Wire EDM E-codes — power settings and pass management]] _(category+op:2+tag:7)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:6)_
- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:2+tag:4)_
- [[ctrl-239|Mitsubishi Wire EDM glue stop — slug retention for complex profiles]] _(category+op:1+tag:5)_

## Tags

#jm-die #mitsubishi #wire-edm #multi-pass #offset-variables #h-variables #skim-pass #program-structure #operation-roughing #operation-threading #operation-adaptive_milling #operation-edm #machine-mitsubishi
