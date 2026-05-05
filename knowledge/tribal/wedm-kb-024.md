---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-024
title: Start hole positioning: 2-3mm from contour, never inside radius
category: setup
domain: controller_specific
knowledge_type: anti_pattern
confidence: 90
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "start-hole", "threading", "lead-in", "positioning", "operation:profiling", "operation:threading"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: b76a6f90c874ef4e43817216a330b5abe214f787aff58c60601c4158a3bb6442
mirror_ts: 2026-05-05T13:36:01.798Z
mirror_engine: TribalVaultPopulatorEngine
---

# Start hole positioning: 2-3mm from contour, never inside radius

**Category:** `setup` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

Position the start (threading) hole 2-3mm from the contour, connected by a straight lead-in. NEVER place the start hole directly on the contour or inside a tight radius — the re-thread after wire break will fail because the hole diameter is only ~0.3mm larger than the wire, leaving no room for the wire guide to find the hole at an angle. For multiple contours, minimize start hole count by chaining contours with rapid moves between them.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:2)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:1)_
- [[wedm-kb-021|Submerged vs non-submerged: always submerge when possible]] _(category+op:1+tag:1)_
- [[wedm-kb-025|Workpiece leveling: tram to <0.01mm across full length]] _(category+op:1+tag:1)_

## Tags

#wire-edm #start-hole #threading #lead-in #positioning #operation-profiling #operation-threading
