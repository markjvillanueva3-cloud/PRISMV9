---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-058
title: VT debug files for troubleshooting tool search
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 89
source: document:Virtual Tool Format Reference
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "debugging", "troubleshooting"]
material_groups: []
operation_types: []
content_hash: 1ce7fe6f814ddd44985d48423245f88eec28ad3ca0b8467e6aaef6a977445b05
mirror_ts: 2026-05-05T13:36:01.807Z
mirror_engine: TribalVaultPopulatorEngine
---

# VT debug files for troubleshooting tool search

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `89` · **Source:** `document:Virtual Tool Format Reference`

## Tip

Two debug files in 'Global Working Space\tmp' folder help diagnose Virtual Tool definition errors: virtualToolMap.xml shows the complete search result mapping, and macroConfigurator.log contains logging information including the actual tool search conditions used. Check these files when VT searches return unexpected tools or no results.

## Related tips

- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:2)_
- [[tk-dl-hm-055|Virtual Tool (VT) search filter system for macro automation]] _(category+tag:2)_
- [[tk-dl-hm-027|Virtual Tool Editor automates tool selection with SQL queries and decision tables]] _(category+tag:2)_
- [[tk-dl-hm-057|VT PostSearchActions for conditional job parameter override]] _(category+tag:2)_
- [[tk-dl-hm-028|VT Selection Priority: order matters — tools are eliminated after each rule]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #debugging #troubleshooting
