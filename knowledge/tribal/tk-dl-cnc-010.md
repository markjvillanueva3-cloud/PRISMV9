---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-010
title: Deep hole thresholds: <5D standard, 5-7D peck, 7-10D parabolic, >20D gun drill
category: drilling
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:cnc-deep-hole-guide@thresholds
created_at: 2026-03-03
usage_count: 0
tags: ["deep-hole", "peck", "gun-drill", "ld-ratio", "parabolic-flute", "operation:drilling", "tool:drill"]
material_groups: []
operation_types: ["drilling"]
content_hash: 913159c3d39b5003cf7f45020a4c3df54ba8ec9be05648a6b1ec616cde84225e
mirror_ts: 2026-05-05T13:36:01.465Z
mirror_engine: TribalVaultPopulatorEngine
---

# Deep hole thresholds: <5D standard, 5-7D peck, 7-10D parabolic, >20D gun drill

**Category:** `drilling` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cnc-deep-hole-guide@thresholds`

## Tip

Deep hole drilling technique by L/D ratio: <5D = standard drill (no special cycle), 5-7D = peck drilling required, 7-10D = parabolic flute + peck (reduce feed 10%), 10-20D = custom progressive peck cycle (reduce feed 20%), >20D = gun drill or BTA system (limit ~400D). Through-spindle coolant strongly recommended above 5D.

## Applies to

- Operation types: `drilling`

## Related tips

- [[tk-dl-deep-hole-001|Deep hole drilling: L/D thresholds (5D peck, 7D parabolic, 10D custom, 20D gun drill)]] _(op:1+tag:5)_
- [[cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]] _(op:1+tag:4)_
- [[cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]] _(op:1+tag:4)_
- [[cw-168|Swiss-Type Micro-Drilling — Deep Holes in Small Diameters]] _(op:1+tag:4)_
- [[wnc-086|Deep Hole Drilling with Gun Drill Strategies]] _(op:1+tag:4)_

## Tags

#deep-hole #peck #gun-drill #ld-ratio #parabolic-flute #operation-drilling #tool-drill
