---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-039
title: AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 88
source: document:hypermill-ac-v33@p306-310
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "hole-feature", "frame-limits", "joblist", "feature-recognition"]
material_groups: []
operation_types: []
content_hash: da0ba1ae46a830b798da467b560ee79b51a2070afc572b6b553f3a32b6c80826
mirror_ts: 2026-05-05T13:36:02.123Z
mirror_engine: TribalVaultPopulatorEngine
---

# AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-ac-v33@p306-310`

## Tip

hyperMILL AUTOMATION Center automatically assigns hole machining jobs to joblists based on feature orientation. Frame limits define permissible B-axis (Y direction) and C-axis (Z direction) angle ranges. Three frame creation modes: 2D (separate feature list per hole direction with assigned frame), 5X (all features combined in one list, no frame), Mixed (groups same-direction holes with frames, combines others without). Tolerance parameter controls geometric data transfer accuracy. Use 'Fit feature to start stock' to auto-adjust hole depths to actual stock.

## Related tips

- [[tk-dl-hm-060|AC Server mode: watch folder + batch mode for unattended runs]] _(category+tag:2)_
- [[tk-dl-hm-116|AC Basic Tutorial: complete automation script from unaligned part to NC code]] _(category+tag:2)_
- [[tk-dl-hm-119|AC Global Clearance Plane prevents calculation issues across setups]] _(category+tag:2)_
- [[tk-dl-hm-117|AC NCS orientation: two-face method for automatic part alignment]] _(category+tag:2)_
- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(category+tag:2)_

## Tags

#hypermill #automation-center #hole-feature #frame-limits #joblist #feature-recognition
