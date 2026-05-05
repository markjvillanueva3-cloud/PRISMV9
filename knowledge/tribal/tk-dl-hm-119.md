---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-119
title: AC Global Clearance Plane prevents calculation issues across setups
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 90
source: video:hypermill-AC-basic-tutorial@15-17min
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "clearance-plane", "multi-setup", "safety"]
material_groups: []
operation_types: []
content_hash: 61b5570704e299267bdb74638679acc33e3261d22fa78aece71af3f06871b396
mirror_ts: 2026-05-05T13:36:01.455Z
mirror_engine: TribalVaultPopulatorEngine
---

# AC Global Clearance Plane prevents calculation issues across setups

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `90` · **Source:** `video:hypermill-AC-basic-tutorial@15-17min`

## Tip

AUTOMATION Center Global Clearance Plane function prevents calculation issues when different setups have varying default clearance values. Set a single value (e.g., 20mm) and the function checks each job list for its stock definition, then adjusts the clearance plane to stock-top + offset (e.g., 20.5mm for 0.5mm stock offset). This works regardless of frame orientation — even completely different setup orientations get correctly adjusted clearance values.

## Related tips

- [[tk-dl-hm-120|AC second setup: auto-assign drilling jobs by Z-axis angle filter]] _(category+tag:3)_
- [[tk-dl-hm-060|AC Server mode: watch folder + batch mode for unattended runs]] _(category+tag:2)_
- [[tk-dl-hm-116|AC Basic Tutorial: complete automation script from unaligned part to NC code]] _(category+tag:2)_
- [[tk-dl-hm-039|AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment]] _(category+tag:2)_
- [[tk-dl-hm-117|AC NCS orientation: two-face method for automatic part alignment]] _(category+tag:2)_

## Tags

#hypermill #automation-center #clearance-plane #multi-setup #safety
