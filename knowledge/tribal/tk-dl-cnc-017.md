---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-017
title: Small features below 2.5mm require micro-machining — cost jumps significantly
category: design
domain: document_learned
knowledge_type: workaround
confidence: 85
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "micro-machining", "small-features", "edm", "cost", "operation:edm"]
material_groups: []
operation_types: ["edm"]
content_hash: e3fe3c55a708b2fd8ba9b086829e3846b1865c0cc99ad43e5a3632e187d36c34
mirror_ts: 2026-05-05T13:36:03.206Z
mirror_engine: TribalVaultPopulatorEngine
---

# Small features below 2.5mm require micro-machining — cost jumps significantly

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

Features smaller than 2.5mm width/diameter enter micro-machining territory requiring specialized spindles (40,000+ RPM), microscope inspection, and extremely rigid setups. Feasible minimum is ~0.1mm but cost is 10-50× standard machining. Below 0.1mm, consider EDM or laser machining instead of conventional CNC.

## Applies to

- Operation types: `edm`

## Related tips

- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+op:1+tag:1)_
- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+op:1+tag:1)_
- [[tk-dl-hm-083|Undercut analysis for machining accessibility]] _(category+op:1+tag:1)_
- [[tk-dl-cnc-004|Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm]] _(category+tag:2)_
- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+tag:1)_

## Tags

#dfm #micro-machining #small-features #edm #cost #operation-edm
