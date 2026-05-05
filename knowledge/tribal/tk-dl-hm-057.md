---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-057
title: VT PostSearchActions for conditional job parameter override
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:Virtual Tool Format Reference
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "job-config", "macro"]
material_groups: []
operation_types: []
content_hash: 4665563c13c5a477924de1480f81108e732ac15162aa070b5a5a347bd9826505
mirror_ts: 2026-05-05T13:36:01.444Z
mirror_engine: TribalVaultPopulatorEngine
---

# VT PostSearchActions for conditional job parameter override

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:Virtual Tool Format Reference`

## Tip

Virtual Tool PostSearchActions fire after tool search completes, with ToolFound and ToolNotFound branches. Use SetJobCfg to override job parameters — when overriding formula-driven parameters, you must also clear the formula CFG (suffix '_F'). Use NCTool.Folder conditions to detect tool categories and set behavior accordingly. For hidden CFG parameters, export the job and inspect the file.

## Related tips

- [[tk-dl-hm-055|Virtual Tool (VT) search filter system for macro automation]] _(category+tag:3)_
- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:2)_
- [[tk-dl-hm-027|Virtual Tool Editor automates tool selection with SQL queries and decision tables]] _(category+tag:2)_
- [[tk-dl-hm-058|VT debug files for troubleshooting tool search]] _(category+tag:2)_
- [[tk-dl-hm-028|VT Selection Priority: order matters — tools are eliminated after each rule]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #job-config #macro
