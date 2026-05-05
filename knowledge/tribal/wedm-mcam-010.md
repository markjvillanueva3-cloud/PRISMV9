---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-010
title: Overlap option eliminates burrs at contour start/end junction
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: tip
confidence: 86
source: mastercam_wire_tutorial:page28
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "overlap", "burr", "junction", "finish", "witness-mark", "mastercam", "operation:profiling", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: fda25a6cee3c0e2ff0f1c5b8d901b3a153bf173781ebf18e41a3e6798d55c8d4
mirror_ts: 2026-05-05T13:36:03.179Z
mirror_engine: TribalVaultPopulatorEngine
---

# Overlap option eliminates burrs at contour start/end junction

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `86` · **Source:** `mastercam_wire_tutorial:page28`

## Tip

The Overlap option in Mastercam Wire extends the toolpath slightly past the start point to eliminate potential burrs where the cut begins and ends. Typical overlap: 0.02mm (0.0008"). The wire cuts past the starting point, then retracts — this ensures the junction is fully cleaned. Without overlap, a small witness line or burr can remain where the first and last discharge craters meet. Use overlap on: precision die profiles, punch inserts, any feature with cosmetic requirements. Do NOT use overlap on no-core toolpaths (creates double-cut at start). The overlap motion uses skim pass power settings, not rough.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-003|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]] _(category+op:1+tag:4)_
- [[wedm-mcam-003|Makino DUO: use line-only lead-in; never arc leads on taper programs]] _(category+op:1+tag:3)_
- [[wedm-mcam-001|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]] _(category+op:1+tag:3)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:3)_
- [[wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]] _(category+op:1+tag:3)_

## Tags

#wire-edm #overlap #burr #junction #finish #witness-mark #mastercam #operation-profiling #operation-roughing
