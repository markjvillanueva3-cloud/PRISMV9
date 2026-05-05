---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-019
title: Internal fillet must be ≥1/3 × pocket depth for tool rigidity
category: design
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:cnc-complete-guide@design-rules
created_at: 2026-03-03
usage_count: 0
tags: ["dfm", "fillet", "internal-corner", "pocket", "tool-diameter", "operation:pocketing", "tool:unknown"]
material_groups: []
operation_types: ["pocketing"]
content_hash: da6f4142e19b308a10dfaffb01652243b6227a309ee775e5fabe8db19a5b9a88
mirror_ts: 2026-05-05T13:36:02.138Z
mirror_engine: TribalVaultPopulatorEngine
---

# Internal fillet must be ≥1/3 × pocket depth for tool rigidity

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cnc-complete-guide@design-rules`

## Tip

Internal corner fillets in pockets should be at least 1/3 of the pocket depth. This allows using a sufficiently rigid tool. A 30mm deep pocket needs ≥10mm fillet radius (20mm tool diameter). Smaller fillets require smaller tools with worse rigidity, causing vibration and limiting depth. Floor edges can be left sharp (tool nose radius) or given 0.1-1mm radius.

## Applies to

- Operation types: `pocketing`

## Related tips

- [[tk-dl-cnc-002|Cavity depth limit: 4× width recommended, 10× tool diameter max]] _(category+op:1+tag:4)_
- [[tk-dl-cnc-004|Standard CNC tolerance: ±0.125mm; tight: ±0.050mm; feasible: ±0.025mm]] _(category+tag:1)_
- [[tk-dl-cnc-001|Minimum wall thickness: 0.8mm metal, 1.5mm plastic]] _(category+tag:1)_
- [[tk-dl-hm-014|Pocket milling tool must not match geometry exactly]] _(op:1+tag:3)_
- [[tk-dl-cnc-003|Thread sizing: M6+ recommended, max engagement 3× nominal]] _(category+tag:1)_

## Tags

#dfm #fillet #internal-corner #pocket #tool-diameter #operation-pocketing #tool-unknown
