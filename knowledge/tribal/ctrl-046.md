---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-046
title: Sodick LN Professional for wire EDM
category: programming
subcategory: sub_program
domain: process_engineering
knowledge_type: tip
confidence: 85
source: controller:sodick_ln_manual
created_at: 2026-03-07
usage_count: 0
tags: ["sodick", "edm", "wire-edm", "ln-professional", "awt", "taper-cutting", "operation:threading", "operation:milling", "operation:edm", "machine:Sodick"]
material_groups: []
operation_types: ["threading", "milling", "edm"]
content_hash: 8fa4be860d4cab3818a1e816fc7644d2cddb5c28fbfd9d7f92bb8f59fc79283a
mirror_ts: 2026-05-05T13:36:03.299Z
mirror_engine: TribalVaultPopulatorEngine
---

# Sodick LN Professional for wire EDM

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `process_engineering`

**Confidence:** `85` · **Source:** `controller:sodick_ln_manual`

## Tip

Sodick's LN Professional EDM controller is optimized for wire/sinker EDM. Key differences from milling controllers: no spindle RPM or feed rate in the traditional sense. Programs specify wire feed tension, flushing pressure, discharge current/voltage, and gap voltage. Sodick uses LN Professional's AWT (Automatic Wire Threading) codes: M50 (thread wire), M51 (cut wire). Taper cutting uses UV-axis programming with standard G41/G42 for wire radius comp.

## Applies to

- Operation types: `threading`, `milling`, `edm`

## Related tips

- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:2+tag:3)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:2+tag:3)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:3)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:2+tag:2)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:2)_

## Tags

#sodick #edm #wire-edm #ln-professional #awt #taper-cutting #operation-threading #operation-milling #operation-edm #machine-sodick
