---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-120
title: AC second setup: auto-assign drilling jobs by Z-axis angle filter
category: setup
domain: video_learned
knowledge_type: correction
confidence: 88
source: video:hypermill-AC-basic-tutorial@13-15min
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "multi-setup", "drilling", "job-assignment", "operation:drilling"]
material_groups: []
operation_types: ["drilling"]
content_hash: 086d310a14b40d3df76fb88e9df616964e1f6b49029680b87514c5f8321c4c77
mirror_ts: 2026-05-05T13:36:02.131Z
mirror_engine: TribalVaultPopulatorEngine
---

# AC second setup: auto-assign drilling jobs by Z-axis angle filter

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `88` · **Source:** `video:hypermill-AC-basic-tutorial@13-15min`

## Tip

AUTOMATION Center can automatically split operations between setups based on tool axis angles. The 'Assign jobs to job list' function checks Z-axis angles (e.g., 0-5 degrees) in the source compound job and moves matching operations to the target job list. Example: bottom-side drilling operations detected by feature recognition are auto-moved to a second setup (Z-minus orientation) with correct coordinate system rotation over X or Y axis.

## Applies to

- Operation types: `drilling`

## Related tips

- [[tk-dl-hm-073|Workplane on axial face/hole for drilling setups]] _(category+op:1+tag:3)_
- [[tk-dl-hm-119|AC Global Clearance Plane prevents calculation issues across setups]] _(category+tag:3)_
- [[bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]] _(category+op:1+tag:1)_
- [[bc-137|BobCAD V36 Operation Cloning for Multi-Feature Parts]] _(category+op:1+tag:1)_
- [[bc-141|BobCAM for SOLIDWORKS Feature-Based Machining from Part Features]] _(category+op:1+tag:1)_

## Tags

#hypermill #automation-center #multi-setup #drilling #job-assignment #operation-drilling
