---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-macro-002
title: hyperMILL Macro DB schema: Machine_Group × Material_Group → Job chain for automation
category: cam_automation
domain: document_learned
knowledge_type: correction
confidence: 90
source: document:hyperMILL-MacroTech-MacroDB-sqlite.sql
created_at: 2026-03-06
usage_count: 0
tags: ["hyperMILL", "macro-database", "job-automation", "feature-detection", "machine-group", "material-group", "operation:drilling", "operation:turning"]
material_groups: []
operation_types: ["drilling", "turning"]
content_hash: 42dd8fc938b5441dbf70cac2436188ae96bed73152cf07df6c2af2c113afcd10
mirror_ts: 2026-05-05T13:36:01.481Z
mirror_engine: TribalVaultPopulatorEngine
---

# hyperMILL Macro DB schema: Machine_Group × Material_Group → Job chain for automation

**Category:** `cam_automation` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hyperMILL-MacroTech-MacroDB-sqlite.sql`

## Tip

hyperMILL Macro Database (SQLite/MariaDB/SQL Server) drives job automation via relational chain: MacroType→Macro→Job→Job_Parameter. Each Macro has Machine_Group and Material_Group filters, priority ranking, and feature-based selection. Each Job stores: SystemJobType (2D/3D/turning/drilling), ToolType, ToolDiameter, ToolTolerance, ToolMinLength, ToolNumber, ToolName, StockResolution, plus binary geometry blobs (ToolGeometry, HolderGeometry, ExtensionGeometry). Job_Parameter stores key-value pairs with Usage context. Features link to macros via Feature→Feature_Parameter for geometry-driven strategy selection. This enables: load model → detect features → select macro by material+machine → generate complete job with correct tools and cutting data.

## Applies to

- Operation types: `drilling`, `turning`

## Related tips

- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(op:2+tag:2)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(op:2+tag:2)_
- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(op:2+tag:2)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(op:2+tag:2)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(op:2+tag:2)_

## Tags

#hypermill #macro-database #job-automation #feature-detection #machine-group #material-group #operation-drilling #operation-turning
