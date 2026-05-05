---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-001
title: JM Die H175 master offset convention — use H175 as the primary offset base
category: setup
subcategory: zero_setting
domain: cam_software
knowledge_type: tip
confidence: 95
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "h-register", "offset", "h175", "shop-standard", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: cfd243e974e8ac0c2ff6d921b482c4a9769ee401a2726d37104f9e20a753094c
mirror_ts: 2026-05-05T13:36:00.890Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die H175 master offset convention — use H175 as the primary offset base

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `cam_software`

**Confidence:** `95` · **Source:** `jm_die_production_analysis`

## Tip

JM Die programs consistently use H175 as the master offset register for rough cut geometry. When setting up a new program, declare H175 first with the total wire + overburn offset (typically 0.0085-0.010"), then cascade H1-H4 or H1-H5 for skim passes with decreasing values. The H175 convention allows quick offset adjustments at the machine without editing the program — the operator can tweak H175 by ±0.0005" to dial in the first part. This is a JM Die shop standard that differs from the Mastercam default of H1 as primary. When training AI on JM Die programs, recognize H175 as the master offset, not H1.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:4)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:4)_
- [[jm-die-006|JM Die glue stop convention — M01 before tab burn-out points]] _(category+op:1+tag:3)_
- [[bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]] _(category+op:1+tag:2)_
- [[jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]] _(op:1+tag:5)_

## Tags

#wire-edm #jm-die #mitsubishi #fa-20s #h-register #offset #h175 #shop-standard #operation-roughing
