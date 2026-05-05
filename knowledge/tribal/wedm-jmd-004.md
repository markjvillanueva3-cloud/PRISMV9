---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-004
title: Glue stop M01 between closed contours: JM Die slug control practice
category: machining
domain: general
knowledge_type: setup_lesson
confidence: 94
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "m01", "glue-stop", "slug", "closed-contour", "workholding", "die-insert", "operation:profiling", "operation:roughing", "tool:indexable_insert"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 72981bb343572293c387a282b9462bc4f7cc02c8333c0c50b6e8ddc9f3a71d6c
mirror_ts: 2026-05-05T13:36:00.929Z
mirror_engine: TribalVaultPopulatorEngine
---

# Glue stop M01 between closed contours: JM Die slug control practice

**Category:** `machining` · **Domain:** `general`

**Confidence:** `94` · **Source:** `jm_die_programs`

## Tip

When a program contains multiple closed contour cutouts (e.g., a die insert with two punch holes), JM Die inserts an M01 (Optional Stop / Glue Stop) block after the rough pass of each contour closes but BEFORE the skim passes begin. The typical sequence is: rough contour 1 → G40 lead-out → M01 (Glue Stop) → M78 M78 → skims for contour 1. The M01 gives the operator a pause to apply a dab of cyanoacrylate adhesive to hold the slug, then press cycle start to continue with skim passes. Without this stop, heavy slugs can drop mid-skim and jam the lower guide or shift the work. The comment '(Glue Stop)' is the standard JM Die in-program annotation — use it consistently so operators recognize it.

## Applies to

- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-kb-026|Tab/slug management for closed contour cuts]] _(category+op:1+tag:5)_
- [[wedm-mcam-009|Tab with skim cuts after — efficient multi-contour slug management]] _(category+op:1+tag:4)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:3)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+op:1+tag:3)_
- [[tk-dl-mc-wire-02|Tab cutting keeps wire EDM parts from dropping]] _(category+tag:5)_

## Tags

#wire-edm #m01 #glue-stop #slug #closed-contour #workholding #die-insert #operation-profiling #operation-roughing #tool-indexable_insert
