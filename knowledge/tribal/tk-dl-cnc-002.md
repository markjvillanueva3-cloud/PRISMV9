---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-002
title: Cavity depth limit: 4× width recommended, 10× tool diameter max
category: design
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "cavity", "pocket", "depth", "fillet", "operation:pocketing"]
material_groups: []
operation_types: ["pocketing"]
content_hash: f1dd6a78d673b8ec33709a7dcc345ada61953587a5f265dca8ff4d02147c910e
mirror_ts: 2026-05-05T13:36:01.463Z
mirror_engine: TribalVaultPopulatorEngine
---

# Cavity depth limit: 4× width recommended, 10× tool diameter max

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

Pocket/cavity depth should not exceed 4× the cavity width (recommended) or 10× the tool diameter (absolute max, 250mm). Deeper cavities require longer tools with larger diameters, which increases internal fillet radius. Internal edge fillets should be ≥1/3 × cavity depth.

## Applies to

- Operation types: `pocketing`

## Related tips

- [[tk-dl-cnc-019|Internal fillet must be ≥1/3 × pocket depth for tool rigidity]] _(category+op:1+tag:4)_
- [[tk-dl-cnc-004|Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm]] _(category+tag:1)_
- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+tag:1)_
- [[tk-dl-cnc-003|Thread sizing: M6+ recommended, max engagement 3× nominal]] _(category+tag:1)_
- [[tk-dl-cnc-012|Undercut width range: 3-40mm, depth ≤ 2× width]] _(category+tag:1)_

## Tags

#dfm #cavity #pocket #depth #fillet #operation-pocketing
