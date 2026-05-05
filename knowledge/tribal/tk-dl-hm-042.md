---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-042
title: Stock definition: enter total dimension and hyperMILL auto-splits offset per side
category: setup
subcategory: zero_setting
domain: video_learned
knowledge_type: setup_lesson
confidence: 85
source: video:hypermill-project-assistance@700-1000s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "stock", "raw-material", "offset", "prismatic", "dimensions", "operation:turning"]
material_groups: []
operation_types: ["turning"]
content_hash: 57858bb4e55e277409ad07d385606d42070b6d505082da4922730d9de7302cfb
mirror_ts: 2026-05-05T13:36:03.187Z
mirror_engine: TribalVaultPopulatorEngine
---

# Stock definition: enter total dimension and hyperMILL auto-splits offset per side

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:hypermill-project-assistance@700-1000s`

## Tip

In hyperMILL Project Assistant stock definition, enter the total stock dimension (e.g., 86mm for an 80mm model) and the system automatically distributes the offset equally on both sides (3mm + 3mm). You can lock one side to zero for asymmetric stock (e.g., no stock on bottom Z for table-mounted parts). Stock is defined per axis (X length, Y width, Z height) with independent positive/negative offsets. For prismatic parts use rectangular stock; for turning use cylindrical. The red boundary box shows the material to be removed.

## Applies to

- Operation types: `turning`

## Related tips

- [[hm-004|hyperMILL turning model must be closed planar contour in X-Z plane of turning frame]] _(category+op:1+tag:2)_
- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:1+tag:2)_
- [[tk-dl-hm-050|IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program]] _(category+op:1+tag:2)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:1+tag:2)_
- [[ctrl-188|Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy]] _(category+op:1+tag:1)_

## Tags

#hypermill #stock #raw-material #offset #prismatic #dimensions #operation-turning
