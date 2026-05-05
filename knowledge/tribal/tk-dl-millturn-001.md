---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-millturn-001
title: Mill-turn: XZC vs XYZC vs XYZCB, facial/radial output modes, turret safety sequencing
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:InventorCAM-Turning-Mill-Turn-Course
created_at: 2026-03-06
usage_count: 0
tags: ["mill-turn", "XZC", "XYZC", "XYZCB", "turret-safety", "part-transfer", "swiss-type", "facial-milling", "polar-output", "operation:turning", "operation:milling", "operation:5_axis", "tool:unknown"]
material_groups: []
operation_types: ["turning", "milling", "5_axis"]
content_hash: 1986ad610146abe5666cf2cdc6724a47c057d927d367a3b556185fa37eab0658
mirror_ts: 2026-05-05T13:36:02.161Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mill-turn: XZC vs XYZC vs XYZCB, facial/radial output modes, turret safety sequencing

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:InventorCAM-Turning-Mill-Turn-Course`

## Tip

Mill-turn machine capability tiers: (1) 3-axis XZC: facial + indexial + simultaneous milling, NO Y-axis movements. Use Face mode (XC polar output) for max compatibility. (2) 4-axis XYZC: full facial/indexial/simultaneous milling with Y-axis. Use Diameter mode (XYZ output). (3) 5-axis XYZCB: all operations including B-axis tilting. Turret safety sequencing: ALWAYS retract non-active turret to safe position (RAPID) before starting operations on other turret. Before turning with lower turret: upper turret MUST retract. Before part transfer: lower turret MUST retract. Part transfer sequence: back spindle approaches at safety distance (RAPID), clamp opens, approaches at FEED (200mm/min), clamps on stock, main spindle opens, back spindle returns to home (RAPID). Feed speed for part pickup approach is CRITICAL — too fast risks collision/damage. Swiss-type: parts up to 38mm diameter, L/D > 5 achievable, spline approximation tolerance = 0.005mm.

## Applies to

- Operation types: `turning`, `milling`, `5_axis`

## Related tips

- [[tk-dl-mazak-009|INTEGREX mill-turn: upper/lower turret priority and synchronization]] _(category+op:3+tag:4)_
- [[tk-dl-thread-001|Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry]] _(category+op:2+tag:2)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:2)_
- [[tk-dl-cam-009|Balanced roughing: dual-tool simultaneous cuts halve cycle time]] _(op:3+tag:4)_
- [[tk-dl-cnc-011|CNC machine cost comparison: 3-axis $75/hr baseline]] _(op:3+tag:4)_

## Tags

#mill-turn #xzc #xyzc #xyzcb #turret-safety #part-transfer #swiss-type #facial-milling #polar-output #operation-turning #operation-milling #operation-5_axis #tool-unknown
