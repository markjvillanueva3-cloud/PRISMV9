---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-022
title: Flush nozzle alignment: 0.5mm gap to workpiece surface
category: setup
subcategory: alignment
domain: process_engineering
knowledge_type: setup_lesson
confidence: 89
source: handbook:sodick_operation_manual
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "flushing", "nozzle", "alignment", "gap"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: acaa17190b146e645a07374310a01226037e5dff3f9d565aa529079be803efdf
mirror_ts: 2026-05-05T13:36:02.103Z
mirror_engine: TribalVaultPopulatorEngine
---

# Flush nozzle alignment: 0.5mm gap to workpiece surface

**Category:** `setup` · **Subcategory:** `alignment` · **Domain:** `process_engineering`

**Confidence:** `89` · **Source:** `handbook:sodick_operation_manual`

## Tip

Position the upper and lower flush nozzles 0.5mm from the workpiece surface. Too far (>2mm): flushing pressure drops, debris remains in gap, cutting speed decreases. Too close (<0.2mm): nozzle can contact workpiece during cutting, causing damage or shifting. For stepped parts where the top surface isn't flat, position the upper nozzle 0.5mm above the HIGHEST point. Some operators use shim stock as a gauge to set the gap consistently.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-021|Submerged vs non-submerged: always submerge when possible]] _(category+op:1+tag:2)_
- [[wedm-kb-017|Taper cutting: verify UV zero offset before every job]] _(category+op:1+tag:2)_
- [[wedm-sp-005|SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:1)_
- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:1)_

## Tags

#wire-edm #flushing #nozzle #alignment #gap
