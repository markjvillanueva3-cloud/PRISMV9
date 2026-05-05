---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-061
title: Server-side calculation with separate project path
category: setup
subcategory: zero_setting
domain: document_learned
knowledge_type: setup_lesson
confidence: 85
source: document:Calculation in Server
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "server", "calculation", "operation:milling"]
material_groups: []
operation_types: ["milling"]
content_hash: 027a898003480643f6d6ed030af0ce4086aa7b7ecea722d9fd0eed97cb98d189
mirror_ts: 2026-05-05T13:36:03.191Z
mirror_engine: TribalVaultPopulatorEngine
---

# Server-side calculation with separate project path

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:Calculation in Server`

## Tip

For server-side toolpath calculation in AUTOMATION Center: create a dedicated calculation folder, use 'Set project path' to redirect calculation output there, run milling/calculation procedures, then copy results to the target/outgoing folder. Use 'Path of model' function to update the hyperMILL model path in settings, then save. This workflow isolates calculation artifacts from final deliverables.

## Applies to

- Operation types: `milling`

## Related tips

- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(category+op:1+tag:3)_
- [[tk-dl-hm-015|No double or superimposed surfaces in 3D milling areas]] _(category+op:1+tag:2)_
- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:1+tag:2)_
- [[tk-dl-hm-043|NC Position: set machine zero relative to model or stock at corner/center/Z-top]] _(category+op:1+tag:2)_
- [[tk-dl-hm-050|IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program]] _(category+op:1+tag:2)_

## Tags

#hypermill #automation-center #server #calculation #operation-milling
