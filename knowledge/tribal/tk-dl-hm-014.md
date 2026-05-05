---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-014
title: Pocket milling tool must not match geometry exactly
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:hypermill-manual-en-3@p639
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "pocket", "tool-diameter", "engagement", "2d-milling", "operation:pocketing", "operation:milling"]
material_groups: []
operation_types: ["pocketing", "milling"]
content_hash: 27fec88b0ae01eaf0a33962cca0e87ebf6b6469b7a18ce1264b7d724bbf9eec0
mirror_ts: 2026-05-05T13:36:02.117Z
mirror_engine: TribalVaultPopulatorEngine
---

# Pocket milling tool must not match geometry exactly

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-manual-en-3@p639`

## Tip

In hyperMILL 2D Pocket Milling, ensure the tool is only in contact with the model geometry on one side. The tool diameter must NOT correspond exactly with the model geometry to be machined. An exact match causes full-width engagement on both sides simultaneously, leading to excessive cutting forces and potential tool breakage.

## Applies to

- Operation types: `pocketing`, `milling`

## Related tips

- [[tk-dl-hm-079|Shape spherical analysis to find minimum tool diameter]] _(category+op:1+tag:2)_
- [[tk-dl-hm-036|High Performance Roughing requires fillet radius ≥5% of tool diameter]] _(op:2+tag:3)_
- [[tk-dl-cnc-008|45° face mill gives ~40% more MRR than 90° with balanced forces]] _(category+op:1+tag:1)_
- [[tk-dl-cnc-009|Thread mill diameter must be < 70% of thread diameter]] _(category+op:1+tag:1)_
- [[tk-rx-002|Trochoidal milling tool life multiplier by material vs conventional slotting]] _(category+op:1+tag:1)_

## Tags

#hypermill #pocket #tool-diameter #engagement #2d-milling #operation-pocketing #operation-milling
