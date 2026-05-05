---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-026
title: Tab/slug management for closed contour cuts
category: machining
domain: general
knowledge_type: anti_pattern
confidence: 92
source: handbook:reliable_edm_ch5
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "tab", "slug", "workholding", "closed-contour", "operation:profiling"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 1f8e581e5c3b971aac60861455f78740620a40a2331b7fbe51a8f6ebf634b820
mirror_ts: 2026-05-05T13:36:01.194Z
mirror_engine: TribalVaultPopulatorEngine
---

# Tab/slug management for closed contour cuts

**Category:** `machining` · **Domain:** `general`

**Confidence:** `92` · **Source:** `handbook:reliable_edm_ch5`

## Tip

When cutting closed contours (die openings, through-holes), the slug will drop when the cut completes. For heavy slugs (>1kg): use 2-3 tabs (uncut bridges of 1-2mm width) to hold the slug, or apply adhesive (Super Glue or wax) before the final approach. For light slugs: program an M00 (optional stop) 5mm before the contour closes so the operator can support the slug. NEVER let slugs free-fall — they can jam the wire path or damage the lower guide.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-jmd-004|Glue stop M01 between closed contours: JM Die slug control practice]] _(category+op:1+tag:5)_
- [[wedm-mcam-009|Tab with skim cuts after — efficient multi-contour slug management]] _(category+op:1+tag:4)_
- [[tk-dl-mc-wire-02|Tab cutting keeps wire EDM parts from dropping]] _(category+tag:5)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:2)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+op:1+tag:2)_

## Tags

#wire-edm #tab #slug #workholding #closed-contour #operation-profiling
