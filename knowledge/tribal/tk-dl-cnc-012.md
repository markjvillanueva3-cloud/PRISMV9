---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-012
title: Undercut width range: 3-40mm, depth ≤ 2× width
category: design
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "undercut", "t-slot", "o-ring", "dimensions"]
material_groups: []
operation_types: []
content_hash: cc6969606ee2835962014456cbd88ac7fc03986cafca31d877ff3fcbd7b5e361
mirror_ts: 2026-05-05T13:36:03.200Z
mirror_engine: TribalVaultPopulatorEngine
---

# Undercut width range: 3-40mm, depth ≤ 2× width

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

CNC undercuts (T-slots, O-rings, snap rings) have practical limits: minimum width 3mm (1/8"), maximum width 40mm, and depth should not exceed 2× the width. Clearance diameter must be at least 4× the undercut depth. Standard inch fraction sizes (1/8", 3/16", 1/4") are preferred for tool availability.

## Related tips

- [[tk-dl-cnc-004|Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm]] _(category+tag:1)_
- [[tk-dl-hm-083|Undercut analysis for machining accessibility]] _(category+tag:1)_
- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+tag:1)_
- [[tk-dl-cnc-002|Cavity depth limit: 4× width recommended, 10× tool diameter max]] _(category+tag:1)_
- [[tk-dl-dfm-002|DFM design rules: wall 0.8mm metals, cavity 4×W, hole 4×D, thread M6+]] _(category+tag:1)_

## Tags

#dfm #undercut #t-slot #o-ring #dimensions
