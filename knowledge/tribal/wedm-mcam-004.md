---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-004
title: 4-axis Wire EDM synchronization methods — match upper/lower chains correctly
category: programming
domain: process_engineering
knowledge_type: tip
confidence: 91
source: mastercam_wire_tutorial:page44
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "4-axis", "uv-axis", "synchronization", "sync-mode", "entity", "branch", "taper", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 0b3b2029a3e39fdf38d58e0b9eb099190fc5ece8a0f1973a7dfe38aeda09c189
mirror_ts: 2026-05-05T13:36:38.163Z
mirror_engine: TribalVaultPopulatorEngine
---

# 4-axis Wire EDM synchronization methods — match upper/lower chains correctly

**Category:** `programming` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `mastercam_wire_tutorial:page44`

## Tip

4-axis Wire EDM cuts different profiles in XY (lower) and UV (upper) planes. Synchronization determines how the wire moves between chains: (1) By Entity — matches endpoint of each entity, requires same entity count in both chains. (2) By Branch — matches contours at branch points, requires 3D geometry connecting upper/lower. (3) By Point — matches user-defined point entities on each chain. (4) Manual — user-defined matching of chain sections. (5) By Node — matches parametric splines by node points. (6) Manual/Density — matches chains and assigns density for areas with small radii. Choose sync mode based on geometry: same-shape taper uses By Entity; different-shape profiles need By Point or Manual.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-jmd-005|UV taper programs: set all H-register offsets to zero]] _(category+op:1+tag:3)_
- [[wedm-mcam-003|Makino DUO: use line-only lead-in; never arc leads on taper programs]] _(category+op:1+tag:2)_
- [[wedm-mcam-001|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]] _(category+op:1+tag:2)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:2)_
- [[wedm-mcam-003|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]] _(category+op:1+tag:2)_

## Tags

#wire-edm #4-axis #uv-axis #synchronization #sync-mode #entity #branch #taper #operation-edm
