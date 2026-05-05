---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-071
title: Link associative workplane to hyperMILL Frame
category: setup
subcategory: zero_setting
domain: document_learned
knowledge_type: setup_lesson
confidence: 95
source: document:hypercad-s-v33@p519
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "frame", "multi-axis", "workplane"]
material_groups: []
operation_types: []
content_hash: d8d7dec7fb021cafbddcd032423dbebedeb0c708307761f16f9da2e3396c6d33
mirror_ts: 2026-05-05T13:36:00.841Z
mirror_engine: TribalVaultPopulatorEngine
---

# Link associative workplane to hyperMILL Frame

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypercad-s-v33@p519`

## Tip

For multi-side machining: (1) Enable parametric modeling, (2) create a workplane with Workplane → On face using the Associative option and naming it, (3) either edit an existing frame and enable 'Associative workplane' in Frame definition, or right-click the WP and select 'Link frame to WP' to auto-create a linked frame. Ensure hyperMILL → Setup → Settings → Document → Locking → Activate is OFF before making geometry changes. This keeps CAD workplane and CAM frame synchronized automatically.

## Related tips

- [[tk-dl-hm-073|Workplane on axial face/hole for drilling setups]] _(category+tag:3)_
- [[tk-dl-hm-070|Workplane On Face for 5-axis setups]] _(category+tag:3)_
- [[tk-dl-hm-072|Workplane through 3 points axis control]] _(category+tag:3)_
- [[tk-dl-hm-074|Redefine workplane type without recreating]] _(category+tag:3)_
- [[hm-004|hyperMILL turning model must be closed planar contour in X-Z plane of turning frame]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #frame #multi-axis #workplane
