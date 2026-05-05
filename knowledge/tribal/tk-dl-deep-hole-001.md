---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-deep-hole-001
title: Deep hole drilling: L/D thresholds (5D peck, 7D parabolic, 10D custom, 20D gun drill)
category: strategy
domain: document_learned
knowledge_type: anti_pattern
confidence: 92
source: document:CNCCookbook-Deep-Hole-Drilling
created_at: 2026-03-06
usage_count: 0
tags: ["deep-hole", "drilling", "L/D-ratio", "peck", "parabolic", "gun-drill", "through-coolant", "chip-evacuation", "operation:drilling", "tool:drill"]
material_groups: []
operation_types: ["drilling"]
content_hash: 82efd985fa3391b79fcbbc7b4fced03fecd14131e0df3c780976760e0984fbf4
mirror_ts: 2026-05-05T13:36:01.065Z
mirror_engine: TribalVaultPopulatorEngine
---

# Deep hole drilling: L/D thresholds (5D peck, 7D parabolic, 10D custom, 20D gun drill)

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:CNCCookbook-Deep-Hole-Drilling`

## Tip

Deep hole drilling L/D ratio decision table: (1) L/D ≤ 3: Standard drill, no peck needed (chip evacuation sufficient with through-coolant). (2) 3 < L/D ≤ 5: Peck drilling (G83) with peck depth = 1D first peck, decreasing 20% per subsequent peck. Full retract every 3-5 pecks for chip clearing. (3) 5 < L/D ≤ 7: High-performance peck with parabolic flute drill (better chip evacuation geometry). Peck depth = 0.5D, through-coolant MANDATORY (70+ bar). (4) 7 < L/D ≤ 10: Parabolic flute drill with through-coolant at 70+ bar. Consider pilot hole (2D depth, +0.5mm oversize) for drill wander prevention. (5) 10 < L/D ≤ 20: Custom cycle with phased strategy — standard drill to 3D, switch to long-series drill for remaining depth. Pecks = 0.25-0.5D, 100+ bar through-coolant. (6) L/D > 20: Gun drill (single-flute, self-guiding) or BTA/STS system. Gun drill speed = 50-80% of standard SFM, feed = 0.005-0.015 mm/rev. Requires guide bush and high-pressure coolant (100+ bar). Key rule: NEVER exceed 3× body-diameter in a single peck — chip packing causes catastrophic drill failure.

## Applies to

- Operation types: `drilling`

## Related tips

- [[cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]] _(op:1+tag:6)_
- [[cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]] _(op:1+tag:6)_
- [[tk-dl-cnc-010|Deep hole thresholds: <5D standard, 5-7D peck, 7-10D parabolic, >20D gun drill]] _(op:1+tag:5)_
- [[cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]] _(op:1+tag:5)_
- [[teb-014|Cooling Channel Drilling Uses Deep-Hole Templates]] _(op:1+tag:5)_

## Tags

#deep-hole #drilling #l-d-ratio #peck #parabolic #gun-drill #through-coolant #chip-evacuation #operation-drilling #tool-drill
