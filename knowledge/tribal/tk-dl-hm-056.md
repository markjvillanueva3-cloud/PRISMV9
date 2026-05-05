---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-056
title: VT SelectPriority controls tool selection when multiple match
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 94
source: document:Virtual Tool Format Reference
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "tool-selection", "optimization"]
material_groups: []
operation_types: []
content_hash: 3941a984c965fd289bb852e9494478f99794a352b79d50ae2fe28444ee3937ec
mirror_ts: 2026-05-05T13:36:00.896Z
mirror_engine: TribalVaultPopulatorEngine
---

# VT SelectPriority controls tool selection when multiple match

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `94` · **Source:** `document:Virtual Tool Format Reference`

## Tip

When multiple tools match a Virtual Tool search filter, use SelectPriority with four strategy types: Min (smallest value first), Max (largest value first), Sequence (sort by named values, e.g., 'VHM|HSS'), Condition (matching tools first). Strategies cascade — if first strategy yields ties, the next strategy breaks them. Use 'NCTool.UsableLength|NCTool.ClearanceLength' syntax for fallback. Can be global (in Settings) or per-VirtualTool.

## Related tips

- [[tk-dl-hm-027|Virtual Tool Editor automates tool selection with SQL queries and decision tables]] _(category+tag:3)_
- [[tk-dl-hm-055|Virtual Tool (VT) search filter system for macro automation]] _(category+tag:2)_
- [[tk-dl-hm-079|Shape spherical analysis to find minimum tool diameter]] _(category+tag:2)_
- [[tk-dl-hm-080|Shape curvature analysis for radius-based tool selection]] _(category+tag:2)_
- [[tk-dl-hm-057|VT PostSearchActions for conditional job parameter override]] _(category+tag:2)_

## Tags

#hypermill #virtual-tool #tool-selection #optimization
