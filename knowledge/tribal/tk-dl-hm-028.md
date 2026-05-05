---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-028
title: VT Selection Priority: order matters — tools are eliminated after each rule
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:hypermill-virtual-tool-v33@p8-10
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "selection-priority", "min-max", "sequence", "tool-search"]
material_groups: []
operation_types: []
content_hash: e06a6186292703ca63388f98ba095e9cb6906266fa0a3d0ca0c7114a40a9f8c0
mirror_ts: 2026-05-05T13:36:02.121Z
mirror_engine: TribalVaultPopulatorEngine
---

# VT Selection Priority: order matters — tools are eliminated after each rule

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-virtual-tool-v33@p8-10`

## Tip

In hyperMILL Virtual Tool selection priority, rules are applied sequentially and tools not meeting each criterion are removed from the candidate list. Order is critical: MIN(diameter) first keeps the smallest tool; MIN(length) first keeps the shortest. After each rule, non-matching tools are deleted. At least one tool always survives. If multiple remain after all rules, the first in the list is used. Use SEQUENCE for folder preference ordering (folder1|folder2|folder3).

## Related tips

- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:2)_
- [[tk-dl-hm-055|Virtual Tool (VT) search filter system for macro automation]] _(category+tag:2)_
- [[tk-dl-hm-027|Virtual Tool Editor automates tool selection with SQL queries and decision tables]] _(category+tag:2)_
- [[tk-dl-hm-057|VT PostSearchActions for conditional job parameter override]] _(category+tag:2)_
- [[tk-dl-hm-058|VT debug files for troubleshooting tool search]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #selection-priority #min-max #sequence #tool-search
