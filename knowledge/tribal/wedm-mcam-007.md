---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-007
title: Break closest entity to thread point — creates perpendicular wire approach
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: tip
confidence: 85
source: mastercam_wire_tutorial:page12
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "chaining", "thread-point", "perpendicular", "approach", "break-entity", "mastercam", "operation:threading", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 48fbb1e2f5d95b57fb0852e2a9a57562b010de89fbae75db3e84feedc5fb0da8
mirror_ts: 2026-05-05T13:36:03.504Z
mirror_engine: TribalVaultPopulatorEngine
---

# Break closest entity to thread point — creates perpendicular wire approach

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `85` · **Source:** `mastercam_wire_tutorial:page12`

## Tip

When chaining geometry for Wire EDM, enable 'Break closest entity to thread point' in Chaining Options. This breaks the entity closest to the thread point into two pieces so the toolpath begins with a perpendicular move. Benefits: (1) creates the shortest motion between thread point and geometry, (2) ensures a clean 90° entry into the cut, (3) prevents the wire from approaching at a shallow angle that can leave witness marks. This is especially important when the thread point is outside the stock — the perpendicular approach minimizes air-cutting distance. Disable only for No Core toolpaths where the thread point IS the start point.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-003|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]] _(category+op:1+tag:4)_
- [[wedm-mcam-001|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]] _(category+op:1+tag:3)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:3)_
- [[wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]] _(category+op:1+tag:3)_
- [[wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]] _(category+op:1+tag:2)_

## Tags

#wire-edm #chaining #thread-point #perpendicular #approach #break-entity #mastercam #operation-threading #operation-edm
