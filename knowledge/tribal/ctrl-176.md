---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-176
title: Mazak Matrix vs Smooth vs 640MT controller — key programming differences
category: programming
subcategory: post_processor
domain: cam_software
knowledge_type: anti_pattern
confidence: 95
source: controller:mazak_qtu200m_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "matrix", "smooth", "640mt", "controller", "rigid-tapping", "m29", "m511", "g68.2", "differences", "compatibility", "operation:tapping", "operation:adaptive_milling", "operation:5_axis", "machine:Mazak"]
material_groups: []
operation_types: ["tapping", "adaptive_milling", "5_axis"]
content_hash: 888534194ec40eaaa839d678d01fc9ee5e6debbb14bc001db9cc6b121d74aeb5
mirror_ts: 2026-05-05T13:36:00.866Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak Matrix vs Smooth vs 640MT controller — key programming differences

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `cam_software`

**Confidence:** `95` · **Source:** `controller:mazak_qtu200m_cps_rev44199`

## Tip

Mazak machines span three controller generations with important programming differences. 640MT (older QTU): basic G-code; speed sync = M380/M381 (not M511/M513); no RTCP; limited 5-axis capability. Matrix / Matrix 2 (mid-generation): rigid tapping requires M29 preamble before G84 — format: M29 S[rpm], then G84 block; speed sync = M511/M513; G68 tilted plane; RTCP via G43.4. Smooth (SmoothG, SmoothX, SmoothAI — latest): G84 rigid tapping is native, no M29 needed; G68.2 Euler-angle tilted plane is preferred; SmoothAI adaptive feedrate; full RTCP; Smooth Machining Control for surface quality. In Fusion 360, the Integrex post controllerType property selects Matrix or Smooth; the QTU post adds 640MT as a third option — choosing 640MT outputs M380/M381 instead of M511/M513. CRITICAL: never run a Smooth-targeted program (G84 without M29) on a Matrix machine — it will fail with a tapping error. Always confirm controller generation before first run.

## Applies to

- Operation types: `tapping`, `adaptive_milling`, `5_axis`

## Related tips

- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:2+tag:3)_
- [[ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]] _(category+op:1+tag:4)_
- [[ctrl-010|Fanuc rigid tapping G84 with synchronization]] _(category+op:1+tag:3)_
- [[tk-dl-mazak-006|Mazatrol auto tool development: multi-drill staging by hole diameter]] _(category+op:1+tag:3)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:1+tag:3)_

## Tags

#mazak #matrix #smooth #640mt #controller #rigid-tapping #m29 #m511 #g68-2 #differences #compatibility #operation-tapping #operation-adaptive_milling #operation-5_axis #machine-mazak
