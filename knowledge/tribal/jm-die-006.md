---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-006
title: JM Die glue stop convention — M01 before tab burn-out points
category: setup
domain: process_engineering
knowledge_type: tip
confidence: 88
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "m01", "optional-stop", "glue-tab", "slug-drop", "mitsubishi", "operation:turning", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 21646e3a77762ed3bc2a98990ef02c9453c78b2eed3f7d575d52ef703ac4a5b9
mirror_ts: 2026-05-05T13:36:02.547Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die glue stop convention — M01 before tab burn-out points

**Category:** `setup` · **Domain:** `process_engineering`

**Confidence:** `88` · **Source:** `jm_die_production_analysis`

## Tip

JM Die uses M01 (optional stop) at strategic points in wire EDM programs for operator intervention, typically: (1) before burning out glue tabs (allows operator to reduce tank level and position catch tray), (2) at major slug drop points where manual extraction is needed, (3) before final skim on critical tolerance features. The M01 is optional stop, not M00 mandatory stop — this allows unattended runs when the operator cycles 'optional stop OFF' on the controller. During setup runs, keep optional stop ON; for production runs, turn it OFF for continuous cutting.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:3)_
- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:3)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:3)_
- [[wedm-kb-027|Wire EDM work coordinate: always edge-find in X and Y]] _(category+op:1+tag:2)_
- [[bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]] _(category+op:1+tag:2)_

## Tags

#wire-edm #jm-die #m01 #optional-stop #glue-tab #slug-drop #mitsubishi #operation-turning #operation-edm
