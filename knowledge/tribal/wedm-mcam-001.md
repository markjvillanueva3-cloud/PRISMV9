---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-001
title: Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: tip
confidence: 90
source: mastercam_wire_tutorial:page13
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "overburn", "wire-offset", "multi-pass", "skim", "mastercam", "compensation", "material:P", "material:Steel", "operation:roughing", "operation:edm"]
material_groups: ["P"]
operation_types: ["wire_edm"]
content_hash: a815a2cccd09204ce31b59fefbadf65d7f43ec0ca29a57d9b562b8288114836d
mirror_ts: 2026-05-05T13:36:38.219Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `mastercam_wire_tutorial:page13`

## Tip

In multi-pass Wire EDM, the wire overburn (kerf compensation beyond wire radius) decreases with each pass. Mastercam Wire default progression for 0.20mm wire on steel: Pass 1 (rough) = 0.035mm overburn, Pass 2 (first skim) = 0.02mm, Pass 3 (second skim) = 0.01mm, Pass 4 (final skim) = 0mm. Rationale: rough pass removes bulk material with large craters → larger overburn accounts for rougher kerf wall. Each skim removes less material with smaller craters, so overburn decreases. Final pass targets finished size with zero overburn. This progression is baked into Mastercam TECH libraries. If manually programming, follow this reduction pattern.

## Applies to

- Material groups: `P`
- Operation types: `wire_edm`

## Related tips

- [[wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]] _(category+material:1+op:1+tag:2)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:4)_
- [[mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]] _(material:1+op:1+tag:6)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+tag:3)_
- [[wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]] _(category+op:1+tag:3)_

## Tags

#wire-edm #overburn #wire-offset #multi-pass #skim #mastercam #compensation #material-p #material-steel #operation-roughing #operation-edm
