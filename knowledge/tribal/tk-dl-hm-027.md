---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-027
title: Virtual Tool Editor automates tool selection with SQL queries and decision tables
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:hypermill-virtual-tool-v33@p6-13
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "automation", "sql", "decision-table", "tool-selection"]
material_groups: []
operation_types: []
content_hash: 6f1aef544689f8b5509c66281bcf03a256f0e8e7f282b7dea54626bf2b07da7d
mirror_ts: 2026-05-05T13:36:01.438Z
mirror_engine: TribalVaultPopulatorEngine
---

# Virtual Tool Editor automates tool selection with SQL queries and decision tables

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-virtual-tool-v33@p6-13`

## Tip

hyperMILL Virtual Tool (VT) Editor defines automated tool search rules as XML. The pipeline: Pre-action (calculations/variable setup) → Search filter (SQL queries against tool DB with AND/OR logic) → Selection priority (MIN/MAX/SEQUENCE/CONDITION ranking) → Post action (found/not-found handling). Decision tables map machine × material → tool folder/parameters. All search filters are sent as SQL queries — use LIKE with % wildcards for partial name matching. VT definitions are reusable across macros.

## Related tips

- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:3)_
- [[tk-dl-hm-055|Virtual Tool (VT) search filter system for macro automation]] _(category+tag:3)_
- [[tk-dl-hm-079|Shape spherical analysis to find minimum tool diameter]] _(category+tag:2)_
- [[tk-dl-hm-080|Shape curvature analysis for radius-based tool selection]] _(category+tag:2)_
- [[tk-dl-hm-057|VT PostSearchActions for conditional job parameter override]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #automation #sql #decision-table #tool-selection
