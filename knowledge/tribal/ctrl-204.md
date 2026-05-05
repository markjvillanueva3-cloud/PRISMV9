---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-204
title: Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: rule
confidence: 92
source: controller:mitsubishi_m800_sss_manual
created_at: 2026-04-15
usage_count: 0
tags: ["mitsubishi", "m800", "m80", "sss-control-ii", "super-smooth-surface", "g05", "high-speed", "look-ahead", "surface-finish", "die-mold", "operation:profiling", "operation:finishing", "operation:tapping", "operation:hsm", "operation:edm", "machine:Mitsubishi"]
material_groups: []
operation_types: ["profiling", "finishing", "tapping", "hsm", "edm"]
content_hash: 86501f1b17555a6e2b40a9b8e0e4c200487e66c2ad29054b95b16b823acbf83c
mirror_ts: 2026-05-05T13:36:01.100Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `92` · **Source:** `controller:mitsubishi_m800_sss_manual`

## Tip

SSS Control II (Super Smooth Surface) is Mitsubishi's high-speed contouring mode available on M800 and M80 series. Activate with G05 P10000 (high-speed ON) and deactivate with G05 P0. On the older M70, use G05 P1/P0 instead. SSS II does three things simultaneously: (1) increases the look-ahead buffer to 540 blocks (M800) or 400 blocks (M80) to pre-read curves ahead of the tool, (2) converts short line segments from CAM output into internal spline curves for smoother axis motion, and (3) adjusts acceleration/deceleration profiles to match the tolerance corridor. The tolerance corridor is set via machine parameter — typical die/mold work uses 0.002-0.005mm. Tighter tolerances reduce feed rate but improve surface finish. For JM Die EDM electrode graphite machining, a tolerance of 0.003mm with G05 P10000 active gives Ra 0.8 surface without manual polishing. Always cancel with G05 P0 before rigid tapping cycles and before G28 home moves, as SSS II can interfere with synchronized-axis motion.

## Applies to

- Operation types: `profiling`, `finishing`, `tapping`, `hsm`, `edm`

## Related tips

- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:3+tag:5)_
- [[ctrl-239|Mitsubishi Wire EDM glue stop — slug retention for complex profiles]] _(category+op:3+tag:5)_
- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:2+tag:7)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:3+tag:4)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:6)_

## Tags

#mitsubishi #m800 #m80 #sss-control-ii #super-smooth-surface #g05 #high-speed #look-ahead #surface-finish #die-mold #operation-profiling #operation-finishing #operation-tapping #operation-hsm #operation-edm #machine-mitsubishi
