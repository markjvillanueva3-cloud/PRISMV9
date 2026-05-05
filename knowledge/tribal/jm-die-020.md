---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-020
title: JM Die program optimization target — maximize productivity while maintaining Ra and tolerance
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 93
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "optimization", "productivity", "feed-rate", "ra", "tolerance", "cycle-time", "operation:adaptive_milling"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 67c9784a670a533c7a8d8420a9ce8fae592345c6bfb4b7d1faf5ffa3a74b76d6
mirror_ts: 2026-05-05T13:36:01.036Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die program optimization target — maximize productivity while maintaining Ra and tolerance

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `jm_die_production_analysis`

## Tip

The ultimate goal of JM Die WEDM program optimization: maximize cutting area per hour (in²/hr) while achieving the specified Ra and tolerance. Optimization hierarchy: (1) Never sacrifice tolerance — ±0.0005" is sacred for die work. (2) Never exceed Ra spec — 16-20 µin standard, 12 µin for precision. (3) Maximize feed rate within physics limits for the material/thickness. (4) Minimize passes only if Ra spec allows — 3-pass for Ra 32+, 4-pass for Ra 16-20, 5-pass for Ra <16. (5) Use adaptive control (M90) to auto-optimize feed rate. The WEDMProgramOptimizerEngine computes expected improvements: typical gains are 10-25% cycle time reduction on amateur programs while matching or improving quality.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]] _(category+op:1+tag:4)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:3)_
- [[jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]] _(category+op:1+tag:3)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+op:1+tag:3)_
- [[jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]] _(category+op:1+tag:3)_

## Tags

#wire-edm #jm-die #optimization #productivity #feed-rate #ra #tolerance #cycle-time #operation-adaptive_milling
