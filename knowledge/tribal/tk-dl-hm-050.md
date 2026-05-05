---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-050
title: IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 85
source: video:imts-basic-setup@6-210s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "imts", "quick-setup", "project-assistant", "workflow", "best-practice", "operation:face_milling", "operation:turning", "operation:milling"]
material_groups: []
operation_types: ["face_milling", "turning", "milling"]
content_hash: 6e643472323184789d4e5fd48bb4bc9a2086424dafd9a85883e79f12a9ee5382
mirror_ts: 2026-05-05T13:36:03.190Z
mirror_engine: TribalVaultPopulatorEngine
---

# IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:imts-basic-setup@6-210s`

## Tip

Demonstrated IMTS 2022 workflow for quick hyperMILL setup: (1) New → Project Assistant (not manual job list), (2) select milling product (part model), (3) choose milling or mill-turn, (4) orient NCS — align Z to top face, X to longest edge of part, (5) enter stock dimensions — system auto-splits offsets evenly, set Z offset for facing allowance, (6) set NC position (Z-top, basic mode), (7) create orthogonal frame from stock, (8) select material and machine (e.g., C22), (9) click OK — job list auto-populates with NCS, stock, milling area, and post processor ready for toolpath programming.

## Applies to

- Operation types: `face_milling`, `turning`, `milling`

## Related tips

- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:2+tag:5)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:2+tag:3)_
- [[bc-148|BobCAD Mill-Turn Synchronization Timeline for Overlapping Operations]] _(category+op:2+tag:3)_
- [[ctrl-188|Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy]] _(category+op:2+tag:2)_
- [[tk-dl-cam-010|Mill-turn advantage: single setup eliminates re-fixturing errors]] _(category+op:2+tag:2)_

## Tags

#hypermill #imts #quick-setup #project-assistant #workflow #best-practice #operation-face_milling #operation-turning #operation-milling
