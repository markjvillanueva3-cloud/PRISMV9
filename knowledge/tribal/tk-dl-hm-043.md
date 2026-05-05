---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-043
title: NC Position: set machine zero relative to model or stock at corner/center/Z-top
category: setup
subcategory: zero_setting
domain: video_learned
knowledge_type: setup_lesson
confidence: 85
source: video:hypermill-project-assistance@1000-1200s,video:imts-basic-setup@65-183s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "nc-position", "machine-zero", "touch-off", "work-offset", "operation:milling"]
material_groups: []
operation_types: ["milling"]
content_hash: 4f7b760cbdc0159ef016f64949812602857d3cee35fd23f4e04e107ee5e061c8
mirror_ts: 2026-05-05T13:36:03.188Z
mirror_engine: TribalVaultPopulatorEngine
---

# NC Position: set machine zero relative to model or stock at corner/center/Z-top

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:hypermill-project-assistance@1000-1200s,video:imts-basic-setup@65-183s`

## Tip

hyperMILL NC Position defines where the machine zero point sits on the workpiece. Two modes: User-defined (manual coordinates) or Basic Position (automatic). Basic Position can reference the Model or Stock geometry, with options for X/Y placement (corner positions or center) and Z height (top, middle, or bottom). For milling, Z-top of stock with XY at a corner is most common — matches typical shop-floor touch-off practice.

## Applies to

- Operation types: `milling`

## Related tips

- [[tk-dl-hm-015|No double or superimposed surfaces in 3D milling areas]] _(category+op:1+tag:2)_
- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(category+op:1+tag:2)_
- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:1+tag:2)_
- [[tk-dl-hm-050|IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program]] _(category+op:1+tag:2)_
- [[tk-dl-hm-061|Server-side calculation with separate project path]] _(category+op:1+tag:2)_

## Tags

#hypermill #nc-position #machine-zero #touch-off #work-offset #operation-milling
