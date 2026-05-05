---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-005
title: JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20
category: setup
domain: process_engineering
knowledge_type: tip
confidence: 93
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "m800", "startup", "m-code", "m78", "m80", "m82", "m84", "m20", "operation:threading", "operation:adaptive_milling", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: f96940c895a3f3acab22c6d8f7e50680e8bb3ad0e2069f8bf256828c093b919f
mirror_ts: 2026-05-05T13:36:01.034Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20

**Category:** `setup` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `jm_die_production_analysis`

## Tip

JM Die programs follow the standard Mitsubishi FA startup M-code sequence: M78 (fill tank), M80 (water circulation on), M82 (wire drive on), M84 (power supply on), then M20 (thread wire through start hole). After M20, move to first approach point (G0), then engage M90 (adaptive control) before the first cut (G1). Do NOT skip M78 — even though the tank may already be full from the previous job, M78 confirms fill level and opens the correct valves. Skipping M78 on the FA-20S can cause improper flushing nozzle engagement.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:8)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:4)_
- [[jm-die-006|JM Die glue stop convention — M01 before tab burn-out points]] _(category+op:1+tag:3)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(tag:8)_
- [[wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]] _(op:1+tag:6)_

## Tags

#wire-edm #jm-die #mitsubishi #fa-20s #m800 #startup #m-code #m78 #m80 #m82 #m84 #m20 #operation-threading #operation-adaptive_milling #machine-mitsubishi
