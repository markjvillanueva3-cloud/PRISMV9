---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-workholding-001
title: Workholding selection: vise, vacuum (14.7 psi limit), mandrel, fixture plate + ball locks
category: setup
subcategory: workholding
domain: document_learned
knowledge_type: anti_pattern
confidence: 88
source: document:CNCCookbook-Workholding-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["workholding", "vise", "vacuum", "mandrel", "step-clamp", "toe-clamp", "fixture-plate", "ball-lock", "soft-jaw", "operation:milling", "tool:indexable_insert"]
material_groups: []
operation_types: ["milling"]
content_hash: 371d1f079b808c182b78f2cf7b44fdff8761a6d1cb40f572564a1d85a6e7710d
mirror_ts: 2026-05-05T13:36:02.162Z
mirror_engine: TribalVaultPopulatorEngine
---

# Workholding selection: vise, vacuum (14.7 psi limit), mandrel, fixture plate + ball locks

**Category:** `setup` · **Subcategory:** `workholding` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:CNCCookbook-Workholding-Guide`

## Tip

Workholding selection by part type: medium prismatic: milling vise; large plate: step clamps on fixture plate; many small parts: Pit Bull/edge clamps on plate; round parts: 3-jaw chuck or collet on 4th axis; very thin: vacuum or double-sided tape; no clampable features: wax, low-melt alloy (bismuth), or glue; full top access: toe clamps or expanding mandrels; 2-sided machining: CAM tab supports; production: tooling plate with ball locks (30-second changes, repeatable to 0.0005 in). Vacuum fixtures: hold-down force = 14.7 psi x part area at sea level — small parts pop off when cutting forces exceed vacuum capacity. Step clamps: keep bolt CLOSE to workpiece (not step block), angle clamp down by raising step block above level, use soft shim (soda can strip) to avoid marring. Expanding mandrels: insert into hole on underside, expand to lock — access from every direction except bottom. CAUTION: remember mandrel locations to avoid tool collision inside pockets.

## Applies to

- Operation types: `milling`

## Related tips

- [[ctrl-188|Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy]] _(category+op:1+tag:1)_
- [[tk-dl-hm-015|No double or superimposed surfaces in 3D milling areas]] _(category+op:1+tag:1)_
- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(category+op:1+tag:1)_
- [[tk-dl-cam-010|Mill-turn advantage: single setup eliminates re-fixturing errors]] _(category+op:1+tag:1)_
- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:1+tag:1)_

## Tags

#workholding #vise #vacuum #mandrel #step-clamp #toe-clamp #fixture-plate #ball-lock #soft-jaw #operation-milling #tool-indexable_insert
