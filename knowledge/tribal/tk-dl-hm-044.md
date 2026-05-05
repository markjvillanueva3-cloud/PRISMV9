---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-044
title: Safety frame: default 30mm clearance on all axes, reference to stock preferred
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 85
source: video:hypermill-project-assistance@1200-1350s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "frame", "safety-clearance", "retract", "rapid-moves", "collision"]
material_groups: []
operation_types: []
content_hash: c72077e4e235e03d57ad6dbee0a28c6790b1fdded6f67dd277eb79dc922e30ed
mirror_ts: 2026-05-05T13:36:03.189Z
mirror_engine: TribalVaultPopulatorEngine
---

# Safety frame: default 30mm clearance on all axes, reference to stock preferred

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:hypermill-project-assistance@1200-1350s`

## Tip

hyperMILL frame defines the safe retract zone around the workpiece. Default is 30mm clearance on all six sides (±X, ±Y, ±Z). Can be set relative to Model or Stock — stock-relative is safer since it accounts for extra material. Deselecting the 'all axes' toggle allows Z-only clearance (less safe). The frame appears as a red box in the 3D view and defines where rapid moves are safe. Top/bottom/left/right/front/back frames are generated automatically from these values.

## Related tips

- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:2)_
- [[hm-004|hyperMILL turning model must be closed planar contour in X-Z plane of turning frame]] _(category+tag:2)_
- [[tb-001|TOOL Builder prepares 3D tool models from manufacturers for CAM collision checking]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_

## Tags

#hypermill #frame #safety-clearance #retract #rapid-moves #collision
