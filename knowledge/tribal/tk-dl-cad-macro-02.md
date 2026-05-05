---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-macro-02
title: Cancel-Command-Pause-Input macro pattern
category: automation
domain: document_learned
knowledge_type: tip
confidence: 75
source: document:AC1337_Mighty_Macros@table2-4
created_at: 2026-04-15
usage_count: 0
tags: ["macro", "pattern", "automation", "best-practice", "cad", "cam"]
material_groups: []
operation_types: []
content_hash: 95ed4c7317e57304097f3998392513c8dfb0fcf298e227b205b3c54b1230c4db
mirror_ts: 2026-05-05T13:36:04.132Z
mirror_engine: TribalVaultPopulatorEngine
---

# Cancel-Command-Pause-Input macro pattern

**Category:** `automation` · **Domain:** `document_learned`

**Confidence:** `75` · **Source:** `document:AC1337_Mighty_Macros@table2-4`

## Tip

Robust macro structure for CAD/CAM automation: (1) Cancel any previous action (^C^C), (2) Issue command with dialog suppression (-command or underscore prefix), (3) Pause for user input (\) where needed, (4) Issue returns (;) to confirm selections. Example: ^C^C_-COMMAND;\;option; This pattern ensures macros work regardless of the software's initial state and across different language versions.

## Related tips

- [[tk-dl-cad-macro-01|Macro special characters for CAD/CAM automation]] _(category+tag:4)_
- [[sc2-138|SURFCAM Traditional Macro System for Batch Processing]] _(category+tag:2)_
- [[ec-054|Strategy Manager Automates Repetitive Programming]] _(category+tag:1)_
- [[f360-115|Feature Recognition for Automated Hole Programming]] _(category+tag:1)_
- [[nx-017|FBM Automatic Feature Recognition on Imported Files]] _(category+tag:1)_

## Tags

#macro #pattern #automation #best-practice #cad #cam
