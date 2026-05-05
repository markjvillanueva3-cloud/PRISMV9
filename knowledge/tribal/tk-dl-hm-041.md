---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-041
title: NCS orientation: 3 methods — workplane origin, face-normal, or 3-point pick
category: setup
subcategory: zero_setting
domain: video_learned
knowledge_type: setup_lesson
confidence: 85
source: video:hypermill-project-assistance@180-500s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "ncs", "workpiece-zero", "coordinate-system", "orientation", "face-selection"]
material_groups: []
operation_types: []
content_hash: 877379399bc32e582286d7f3aa25a61109baa9c334c0203909f0d1fac2c91a9d
mirror_ts: 2026-05-05T13:36:03.186Z
mirror_engine: TribalVaultPopulatorEngine
---

# NCS orientation: 3 methods — workplane origin, face-normal, or 3-point pick

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:hypermill-project-assistance@180-500s`

## Tip

hyperMILL NCS (Numerical Control System) orientation for workpiece zero can be defined three ways: (1) Workplane — uses the CAD model origin as-is, (2) Face — select any planar face and Z-axis becomes perpendicular to it (useful for angled setups), (3) Three Points — pick origin point, then X-direction point, then Y-direction point. The X-axis can be aligned to any edge or rotated by entering a specific angle. Use Invert to flip Z-axis direction (e.g., for bottom-side machining). Face mode is most common for simple 3-axis work.

## Related tips

- [[tb-002|Tool holder positional orientation follows specific conventions per spindle type]] _(category+tag:2)_
- [[tk-dl-hm-117|AC NCS orientation: two-face method for automatic part alignment]] _(category+tag:2)_
- [[tk-dl-hm-101|5-Axis Frame with rotation angles A/B/C + rotation angle]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_

## Tags

#hypermill #ncs #workpiece-zero #coordinate-system #orientation #face-selection
