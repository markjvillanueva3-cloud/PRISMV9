---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-021
title: Submerged vs non-submerged: always submerge when possible
category: setup
domain: process_engineering
knowledge_type: rule
confidence: 91
source: handbook:reliable_edm_ch5
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "flushing", "submerged", "cutting-speed", "wire-break"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 6bbfd85bd86e081b0dfef96a13a75d269ca30b887f492eafbab7018863a7e6db
mirror_ts: 2026-05-05T13:36:01.416Z
mirror_engine: TribalVaultPopulatorEngine
---

# Submerged vs non-submerged: always submerge when possible

**Category:** `setup` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `handbook:reliable_edm_ch5`

## Tip

Submerged wire cutting (tank filled above workpiece) improves cutting speed by 10-15% and reduces wire breaks by 20-30% compared to spray/jet flushing. The dielectric bath provides uniform cooling and consistent flushing from all directions. The ONLY reasons to cut non-submerged: (1) workpiece too tall for the tank, (2) real-time visual inspection needed, (3) magnetically clamped parts (water pressure can shift them). For production, submerged cutting is the default.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]] _(category+op:1+tag:4)_
- [[wedm-kb-022|Flush nozzle alignment: 0.5mm gap to workpiece surface]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:1)_
- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:1)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:1)_

## Tags

#wire-edm #flushing #submerged #cutting-speed #wire-break
