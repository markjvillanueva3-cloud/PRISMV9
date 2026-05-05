---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-thread-001
title: Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry
category: strategy
domain: document_learned
knowledge_type: anti_pattern
confidence: 90
source: document:CNCCookbook-Thread-Milling-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["thread-milling", "helical-interpolation", "70-percent-rule", "single-point", "multi-form", "arc-entry", "tapered-thread", "operation:profiling", "operation:threading", "operation:milling", "operation:plunge_milling", "operation:5_axis", "tool:thread_mill"]
material_groups: []
operation_types: ["profiling", "threading", "milling", "plunge_milling", "5_axis"]
content_hash: 3ea672c3d0bd4d9e9dfc21cf610021c7694da92916331715336cb7917c5a67ec
mirror_ts: 2026-05-05T13:36:01.487Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:CNCCookbook-Thread-Milling-Guide`

## Tip

Thread milling key rules: (1) Thread mill diameter must be ≤70% of hole diameter to avoid profile distortion. (2) Single-point vs multi-form selection: single-point for flexibility (any pitch), low forces (thin walls, long reach), hardened materials; multi-form for production speed (one pass possible), longer tool life (wear spread). (3) Entry method: 90° arc entry preferred over linear plunge (lower forces, no delay mark, better accuracy). For tapered/pipe threads, correct the helix every 90° to account for taper — subdivide into 45° (8-segment) arcs for higher accuracy. (4) Helical interpolation: simultaneous G02/G03 XY arc + linear Z motion. Program as: G02 X_ Y_ Z_ I_ J_ F_ where Z gives pitch-per-revolution advancement. Climb milling (conventional thread direction) preferred for thread mills.

## Applies to

- Operation types: `profiling`, `threading`, `milling`, `plunge_milling`, `5_axis`

## Related tips

- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:3+tag:3)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:4+tag:4)_
- [[tk-dl-solidcam-001|iMachining engagement control: 10-80° arc, optimal 40°, spike detection at corners]] _(category+op:2+tag:2)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:2+tag:2)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:2+tag:2)_

## Tags

#thread-milling #helical-interpolation #70-percent-rule #single-point #multi-form #arc-entry #tapered-thread #operation-profiling #operation-threading #operation-milling #operation-plunge_milling #operation-5_axis #tool-thread_mill
