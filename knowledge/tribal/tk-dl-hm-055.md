---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-055
title: Virtual Tool (VT) search filter system for macro automation
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 93
source: document:Virtual Tool Format Reference
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "macro", "automation"]
material_groups: []
operation_types: []
content_hash: 4440353db4214947dede8acaf40587bd9f6c48671cfdbfb98beb3cc6c654149e
mirror_ts: 2026-05-05T13:36:00.945Z
mirror_engine: TribalVaultPopulatorEngine
---

# Virtual Tool (VT) search filter system for macro automation

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:Virtual Tool Format Reference`

## Tip

Virtual Tools decouple macros from specific tool databases using ID-based search filters in .vtx XML files. The .vtx file must share the same name and location as the macro database. Three DB modes exist: DB (direct reference), DB+Auto (auto-calc length from hole data), DB+Auto+ (auto-calc diameter+length). Use RuleFilter with conditions for conditional diameter mapping. Multiple RuleFilters combine with AND logic.

## Related tips

- [[tk-dl-hm-027|Virtual Tool Editor automates tool selection with SQL queries and decision tables]] _(category+tag:3)_
- [[tk-dl-hm-057|VT PostSearchActions for conditional job parameter override]] _(category+tag:3)_
- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:2)_
- [[tk-dl-hm-058|VT debug files for troubleshooting tool search]] _(category+tag:2)_
- [[tk-dl-hm-028|VT Selection Priority: order matters — tools are eliminated after each rule]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #macro #automation
