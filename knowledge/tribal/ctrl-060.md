---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-060
title: Fanuc 0i-TF turning-specific canned cycles
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "turning", "canned-cycles", "threading", "lathe", "operation:face_milling", "operation:profiling", "operation:roughing", "operation:finishing", "operation:drilling", "operation:threading", "operation:turning", "operation:milling", "controller:fanuc"]
material_groups: []
operation_types: ["face_milling", "profiling", "roughing", "finishing", "drilling", "threading", "turning", "milling"]
content_hash: a6de650feded2e556c0baa61d03fb4b1b267dedaff65d054037bd86ef560af39
mirror_ts: 2026-05-05T13:36:03.939Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc 0i-TF turning-specific canned cycles

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fanuc 0i-TF/0i-TF Plus turning canned cycles differ significantly from milling G-codes. Stock removal: G71 (longitudinal rough turning — auto-calculates passes from depth-of-cut), G72 (facing rough cycle), G73 (pattern repeating for castings/forgings). Finishing: G70 (finish cycle — follows G71/G72/G73 profile at finish allowance). Threading: G32/G33 (single-pass thread cutting), G76 (multi-pass auto threading cycle — preferred for production), G92 (simple threading cycle). Grooving/Parting: G75 (grooving cycle with peck). Drilling: G74 (face drilling/peck cycle). Key difference from milling: G90 on turning = single-pass turning cycle (NOT absolute mode — G90/G91 absolute/incremental concept uses different codes on lathes). G76 threading: control auto-determines internal vs external by comparing start X to programmed X.

## Applies to

- Operation types: `face_milling`, `profiling`, `roughing`, `finishing`, `drilling`, `threading`, `turning`, `milling`

## Related tips

- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:7+tag:8)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:6+tag:6)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:5+tag:8)_
- [[tk-dl-okuma-002|Okuma named variables and LAP auto-programming (G80-G88) for turning cycles]] _(op:6+tag:8)_
- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:4+tag:8)_

## Tags

#controller #fanuc #turning #canned-cycles #threading #lathe #operation-face_milling #operation-profiling #operation-roughing #operation-finishing #operation-drilling #operation-threading #operation-turning #operation-milling #controller-fanuc
