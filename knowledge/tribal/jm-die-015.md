---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-015
title: JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02
category: setup
domain: controller_specific
knowledge_type: tip
confidence: 92
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "m800", "shutdown", "m-code", "m21", "m85", "m83", "m81", "m79", "m02", "m30", "operation:threading", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: a575002efe9bdf708cfeab6d49c0e676718f94092ae5e2732e30c564878643f6
mirror_ts: 2026-05-05T13:36:01.200Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02

**Category:** `setup` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `jm_die_production_analysis`

## Tip

JM Die programs follow the standard Mitsubishi FA shutdown M-code sequence: M21 (cut wire at lower guide), M85 (power supply off), M83 (wire drive off), M81 (water circulation off), M79 (drain tank — optional for short jobs), then M02 or M30 (program end). The M21 wire cut command positions the wire end above the lower guide for easy re-threading. Never skip M85 before M83 — cutting wire drive with power still active can damage the wire feeder. For multi-start hole programs, omit M79 drain until after all profiles are complete. The neural analysis engine flags 'AP007: No program end M02/M30' as a major anti-pattern.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:8)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:4)_
- [[jm-die-006|JM Die glue stop convention — M01 before tab burn-out points]] _(category+op:1+tag:3)_
- [[wedm-kb-017|Taper cutting: verify UV zero offset before every job]] _(category+op:1+tag:2)_
- [[wedm-kb-024|Start hole positioning: 2-3mm from contour, never inside radius]] _(category+op:1+tag:2)_

## Tags

#wire-edm #jm-die #mitsubishi #fa-20s #m800 #shutdown #m-code #m21 #m85 #m83 #m81 #m79 #m02 #m30 #operation-threading #machine-mitsubishi
