---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-182
title: Okuma Super-NURBS G08 D/I/L parameters — real-time spline fitting of G01 segments
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:okuma_osp_high_cut_p300_manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "super-nurbs", "g08", "hsm", "surface-finish", "smoothing", "b-spline", "high-cut", "p300", "operation:roughing", "operation:finishing", "machine:Okuma", "controller:okuma"]
material_groups: []
operation_types: ["roughing", "finishing"]
content_hash: 65d7996739f9aea0709d3d8725f188d78bb973a5fb24c68aff0a4f0931a73d6a
mirror_ts: 2026-05-05T13:36:00.974Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma Super-NURBS G08 D/I/L parameters — real-time spline fitting of G01 segments

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:okuma_osp_high_cut_p300_manual`

## Tip

OSP Super-NURBS activates within the G08 High-Cut command via D, I, and L parameters. Standard G08: G08 P0 E0.005 (High Quality, 5 µm tolerance). Super-NURBS G08: G08 P0 E0.005 D0.002 I2 L19.0. Parameter guide: E = path tolerance (outermost bound; use 4× finishing tolerance for roughing), D = NURBS fitting tolerance (D must be ≤ E; use 0.001–0.003 for finishing), I2 = B-spline interpolation mode, L = maximum merged segment length in mm (15–25 mm typical). Effect: OSP merges adjacent G01 segments up to L-length into smooth B-spline curves internally, reducing block cycle time and improving surface finish above 3000 mm/min. Finishing recipe for Ra < 0.8 µm: G08 P0 E0.003 D0.001 I2 L15.0. Cancel: G08 P-1 before section end. Autodesk Fusion post: 'Enable superNURBS smoothing' property adds D/I/L automatically. Requires OSP-P300 firmware R01w+.

## Applies to

- Operation types: `roughing`, `finishing`

## Related tips

- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:2+tag:5)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:2+tag:5)_
- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+op:2+tag:4)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:2+tag:4)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:2+tag:4)_

## Tags

#okuma #osp #super-nurbs #g08 #hsm #surface-finish #smoothing #b-spline #high-cut #p300 #operation-roughing #operation-finishing #machine-okuma #controller-okuma
