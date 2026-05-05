---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-009
title: INTEGREX mill-turn: upper/lower turret priority and synchronization
category: strategy
domain: document_learned
knowledge_type: anti_pattern
confidence: 85
source: document:mazak-mazatrol-matrix@ch4-5
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "integrex", "mill-turn", "dual-turret", "synchronization", "cycle-time", "operation:turning", "operation:milling", "operation:5_axis"]
material_groups: []
operation_types: ["turning", "milling", "5_axis"]
content_hash: 3d927de51d483c53617f2a1dccab06da213a82da6484764ed9f7eb6b12805ee2
mirror_ts: 2026-05-05T13:36:03.220Z
mirror_engine: TribalVaultPopulatorEngine
---

# INTEGREX mill-turn: upper/lower turret priority and synchronization

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:mazak-mazatrol-matrix@ch4-5`

## Tip

INTEGREX IV machines have upper milling spindle + lower turret for simultaneous operations. The 'Priority Function for Same Tool' optimizes tool changes by reusing the same tool across multiple units without returning to the magazine. Lower turret control allows turning operations to run simultaneously with milling operations on the upper spindle. Key constraint: when both turrets are active, the feed rate is limited by the slower operation. Program synchronization points (M-codes) ensure turret positions don't conflict. This dual-turret capability can reduce cycle times by 30-50% on complex parts.

## Applies to

- Operation types: `turning`, `milling`, `5_axis`

## Related tips

- [[tk-dl-millturn-001|Mill-turn: XZC vs XYZC vs XYZCB, facial/radial output modes, turret safety sequencing]] _(category+op:3+tag:4)_
- [[tk-dl-cam-009|Balanced roughing: dual-tool simultaneous cuts halve cycle time]] _(op:3+tag:6)_
- [[tk-dl-thread-001|Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry]] _(category+op:2+tag:2)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:2)_
- [[tk-dl-cnc-011|CNC machine cost comparison: 3-axis $75/hr baseline]] _(op:3+tag:4)_

## Tags

#mazak #integrex #mill-turn #dual-turret #synchronization #cycle-time #operation-turning #operation-milling #operation-5_axis
