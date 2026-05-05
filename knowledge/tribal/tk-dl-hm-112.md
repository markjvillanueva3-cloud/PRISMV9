---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-112
title: Automatic surface extension eliminates Z-level wraparound
category: setup
domain: video_learned
knowledge_type: workaround
confidence: 92
source: video:hypermill-webinar@20-25min
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "surface-extension", "z-level", "wraparound", "automation", "operation:profiling", "operation:finishing", "operation:5_axis"]
material_groups: []
operation_types: ["profiling", "finishing", "5_axis"]
content_hash: dd3f2958c56e421db6aa31518503949bb8efbf146840256d2dce30d41027ba9c
mirror_ts: 2026-05-05T13:36:01.052Z
mirror_engine: TribalVaultPopulatorEngine
---

# Automatic surface extension eliminates Z-level wraparound

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `92` · **Source:** `video:hypermill-webinar@20-25min`

## Tip

hyperMILL Z-level and constant-Z cycles have automatic surface extension that eliminates tool wraparound at open edges. Instead of creating boundary curves or extending surfaces manually in CAD, select 'Minus surfaces' mode in the cycle — pick only the surfaces to machine, and the cycle auto-extends them. This works for Z-level, flat area machining, profile finishing, and 5-axis tangent machining. The extension maintains proper surface speed at edges and provides correct lead-in for 5-axis tool orientation.

## Applies to

- Operation types: `profiling`, `finishing`, `5_axis`

## Related tips

- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:3+tag:4)_
- [[tk-dl-hm-098|hyperMILL Contour Milling dialog: allowance and optimize start points]] _(category+op:2+tag:3)_
- [[tk-dl-hm-105|Clearance plane essential for 5-axis tool orientation changes]] _(category+op:2+tag:3)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:2+tag:3)_
- [[tk-dl-cnc-014|SINUMERIK CYCLE832: set tolerance, smoothing, and jerk for HSM]] _(category+op:2+tag:2)_

## Tags

#hypermill #surface-extension #z-level #wraparound #automation #operation-profiling #operation-finishing #operation-5_axis
