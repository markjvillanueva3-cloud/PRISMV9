---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-205
title: Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences
category: programming
subcategory: macro
domain: process_engineering
knowledge_type: tip
confidence: 91
source: controller:mitsubishi_product_lineup_guide
created_at: 2026-04-15
usage_count: 0
tags: ["mitsubishi", "m70", "m80", "m800", "comparison", "features", "look-ahead", "sss", "omr-dd", "rtcp", "capability", "operation:finishing", "operation:threading", "operation:5_axis", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["finishing", "threading", "5_axis", "edm"]
content_hash: bd92176e6db84eebdc2066be6396072a91d781dd271b6cf63c95e171f75c5315
mirror_ts: 2026-05-05T13:36:01.224Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `controller:mitsubishi_product_lineup_guide`

## Tip

Mitsubishi Electric offers three tiers of CNC control: M70 (entry/mid), M80 (mid-range), M800 (flagship). Key differences by category: LOOK-AHEAD: M70=200 blocks, M80=400 blocks, M800=540 blocks. MAX BLOCK RATE: M70~1000 blk/sec, M80~1700 blk/sec, M800~2400 blk/sec. SSS CONTROL II: M70 not available (uses basic G05), M80 standard, M800 standard plus spline interpolation. OMR-DD: M70 not available, M80 optional, M800 standard. AXES: M70 up to 4+1, M80 up to 6+2, M800 up to 8. 5-AXIS TCP/RTCP: M70 limited (no full RTCP), M80 with option, M800 full RTCP standard. NURBS INTERPOLATION: M70 no, M80 with option, M800 standard. PROGRAM NUMBERS: all use O-word programs; M80/M800 support 8-digit program numbers (O00000001) while M70 uses 4-digit (O0001-O9999). WORK OFFSETS: all support G54.1 P1-P300 extended offsets. For JM Die's Mitsubishi sinker EDMs and wire EDM, the M70V variant is used — it shares the M70 hardware but includes EDM-specific macro cycles for power settings, wire threading, and surface finish conditions.

## Applies to

- Operation types: `finishing`, `threading`, `5_axis`, `edm`

## Related tips

- [[ctrl-204|Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning]] _(category+op:2+tag:7)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:7)_
- [[ctrl-207|Mitsubishi OMR-DD (Optimum Machine Response Direct Drive): setup and surface finish impact]] _(category+op:2+tag:6)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:3)_
- [[ctrl-039|Mitsubishi M800/M80 high-speed SSS control]] _(category+op:1+tag:7)_

## Tags

#mitsubishi #m70 #m80 #m800 #comparison #features #look-ahead #sss #omr-dd #rtcp #capability #operation-finishing #operation-threading #operation-5_axis #operation-edm #machine-mitsubishi
