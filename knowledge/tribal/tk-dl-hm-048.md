---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-048
title: CAD import: hyperMILL reads STEP, NX, IGES, Parasolid, CATIA, and native formats
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 82
source: video:hypermill-day1-interface@200-350s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "cad-import", "step", "nx", "file-formats", "interoperability", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: 28bba26677555e73753d9ff26b37a3936360e80e7dc246b53fdc4198a94d8926
mirror_ts: 2026-05-05T13:36:03.775Z
mirror_engine: TribalVaultPopulatorEngine
---

# CAD import: hyperMILL reads STEP, NX, IGES, Parasolid, CATIA, and native formats

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `82` · **Source:** `video:hypermill-day1-interface@200-350s`

## Tip

hyperMILL supports importing CAD models from multiple formats via File → Open: native hyperMILL format, STEP (.stp/.step — most universal), Siemens NX, IGES, Parasolid, CATIA, and others. STEP is the recommended interchange format when exporting from other CAD systems (NX, SolidWorks, Fusion 360). After import, the model appears in the 3D viewport and the Model browser shows the feature/face count (e.g., 164 features). The model is automatically selected when opening Project Assistant.

## Related tips

- [[tk-dl-hm-034|CONNECTED Machining performs consistency checks before NC transfer]] _(category+tag:2)_
- [[tk-dl-cad-drawing-09|Siemens NX PMI for Model-Based Definition]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_

## Tags

#hypermill #cad-import #step #nx #file-formats #interoperability #controller-siemens
