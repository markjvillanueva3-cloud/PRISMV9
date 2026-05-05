---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cast-003
title: Pattern machining allowance for cast parts by size and material
category: design
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:mit2008-casting@machining-allowance-table
created_at: 2026-03-03
usage_count: 0
tags: ["casting", "machining-allowance", "pattern", "cope", "drag", "material:P", "material:Steel", "material:K", "material:Cast Iron", "operation:boring"]
material_groups: ["P", "K"]
operation_types: ["boring"]
content_hash: cdd089c97965cf397d3813ed3520800528ee729ec285ecd6ead22393e162a3b2
mirror_ts: 2026-05-05T13:36:03.216Z
mirror_engine: TribalVaultPopulatorEngine
---

# Pattern machining allowance for cast parts by size and material

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:mit2008-casting@machining-allowance-table`

## Tip

Cast parts need machining allowance added to pattern dimensions. For cast iron: bore 3.2-7.9mm, surface 2.4-4.8mm, cope side 4.8-7.9mm (increases with pattern size 152-1524mm). Cast steel needs ~50% more allowance than cast iron. Nonferrous alloys need the least: 1.6-4.0mm. Cope (top) side always needs more allowance than drag side due to inclusions and porosity rising during solidification.

## Applies to

- Material groups: `P`, `K`
- Operation types: `boring`

## Related tips

- [[tk-dl-cast-001|Casting shrinkage allowances by material family]] _(material:2+tag:6)_
- [[ec-036|Turning Roughing with Optimized Pass Distribution]] _(material:2+tag:4)_
- [[cw-100|Chip-Break Drilling — Partial Retract for Faster Deep Holes]] _(material:2+tag:4)_
- [[mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]] _(material:2+tag:4)_
- [[tk-dl-cnc-005|HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM]] _(material:2+tag:4)_

## Tags

#casting #machining-allowance #pattern #cope #drag #material-p #material-steel #material-k #material-cast-iron #operation-boring
