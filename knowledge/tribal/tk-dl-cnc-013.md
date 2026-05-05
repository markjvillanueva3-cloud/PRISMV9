---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-013
title: Non-standard hole sizes require end mill boring — 5-10× slower than drilling
category: design
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "holes", "drill-size", "boring", "helical-interpolation", "operation:drilling", "operation:boring", "operation:milling", "tool:endmill", "tool:drill"]
material_groups: []
operation_types: ["drilling", "boring", "milling"]
content_hash: 142cb7cb84997d0da994c1b15b79593faaf2874e42ab134775fdf5303437b1a4
mirror_ts: 2026-05-05T13:36:03.202Z
mirror_engine: TribalVaultPopulatorEngine
---

# Non-standard hole sizes require end mill boring — 5-10× slower than drilling

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

Holes with non-standard diameters cannot use standard twist drills and must be machined with an end mill using helical interpolation or boring. This is 5-10× slower than drilling. Always prefer standard drill sizes (letter, number, fractional, or metric) when possible. Check a drill chart before specifying hole diameters.

## Applies to

- Operation types: `drilling`, `boring`, `milling`

## Related tips

- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(op:3+tag:5)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(op:3+tag:4)_
- [[cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]] _(op:2+tag:5)_
- [[sc-142|Helical Interpolation Boring — Milling Precise Holes Without Boring Bars]] _(op:2+tag:5)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(op:3+tag:3)_

## Tags

#dfm #holes #drill-size #boring #helical-interpolation #operation-drilling #operation-boring #operation-milling #tool-endmill #tool-drill
