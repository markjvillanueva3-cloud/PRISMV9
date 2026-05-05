---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-040
title: Project Assistant automates initial CAM setup: model → stock → NCS → frame → post
category: setup
subcategory: zero_setting
domain: video_learned
knowledge_type: rule
confidence: 85
source: video:hypermill-project-assistance@0-1576s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "project-assistant", "setup", "workflow", "job-list", "automation", "operation:turning", "operation:milling"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: 6f9ad67d7e7cb4a54c290c9e2fc434cd138dcc86ffcc74e4e8201bcbb6836bdd
mirror_ts: 2026-05-05T13:36:03.185Z
mirror_engine: TribalVaultPopulatorEngine
---

# Project Assistant automates initial CAM setup: model → stock → NCS → frame → post

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:hypermill-project-assistance@0-1576s`

## Tip

hyperMILL Project Assistant (right-click Jobs → New → Project Assistant) automates the entire initial setup workflow in sequence: (1) select model/workpiece and process type (milling or mill-turn), (2) define NCS orientation (workpiece zero point), (3) define stock dimensions with per-axis offsets, (4) set NC position (machine zero), (5) define safety frame clearances, (6) name job list and select material + machine + post processor. This replaces manual job list creation and ensures all required parameters are configured before programming begins.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[tk-dl-hm-050|IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program]] _(category+op:2+tag:5)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:2+tag:3)_
- [[ctrl-188|Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy]] _(category+op:2+tag:2)_
- [[tk-dl-cam-010|Mill-turn advantage: single setup eliminates re-fixturing errors]] _(category+op:2+tag:2)_
- [[nx-081|Multi-Spindle Multi-Turret Channel Assignment]] _(category+op:2+tag:2)_

## Tags

#hypermill #project-assistant #setup #workflow #job-list #automation #operation-turning #operation-milling
