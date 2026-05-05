---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-013
title: Update rest material cycle when reference tool changes
category: safety
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:hypermill-manual-en-3@p638
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "rest-machining", "tool-change", "plunge-risk", "2d-milling", "operation:milling", "operation:plunge_milling"]
material_groups: []
operation_types: ["milling", "plunge_milling"]
content_hash: 02fb6d0bef847658f998dca58fa4a4646070d60c34dbbe2d1b4c324cba3277f6
mirror_ts: 2026-05-05T13:36:01.434Z
mirror_engine: TribalVaultPopulatorEngine
---

# Update rest material cycle when reference tool changes

**Category:** `safety` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-manual-en-3@p638`

## Tip

In hyperMILL 2D machining, if the tool diameter is changed in the milling cycle that generates rest material, the corresponding rest material cycle MUST also be updated. Failure to update creates a mismatch where the rest machining cycle assumes the previous tool size, risking tool plunge into material at full depth.

## Applies to

- Operation types: `milling`, `plunge_milling`

## Related tips

- [[tk-dl-hm-032|VMC collision check tolerance must be ≤ half tool diameter]] _(category+op:1+tag:2)_
- [[tk-dl-hm-029|VT collision check only works for hole machining, not milling]] _(category+op:1+tag:2)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(op:2+tag:3)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(op:2+tag:2)_
- [[tk-dl-thread-001|Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry]] _(op:2+tag:2)_

## Tags

#hypermill #rest-machining #tool-change #plunge-risk #2d-milling #operation-milling #operation-plunge_milling
