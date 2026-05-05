---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-149
title: Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps
category: programming
subcategory: post_processor
domain: cam_software
knowledge_type: rule
confidence: 95
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "aicc", "smoothing", "g05.1", "hsm", "finishing", "roughing", "post-processor", "operation:profiling", "operation:roughing", "operation:finishing", "controller:fanuc"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing"]
content_hash: 5deb98dd3b0c649396568dce10bfb9450fbc4be4c43d1db5ca38bccaacc17878
mirror_ts: 2026-05-05T13:36:00.865Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `cam_software`

**Confidence:** `95` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

The Fusion 360 Fanuc post exposes 10 smoothing levels for AI Contour Control. G05.1 Q1 with no R value uses the default level. G05.1 Q1 R1 = roughing (coarsest, fastest), R4 = semi-rough, R7 = semi-finish, R10 = finishing (finest tolerance, slowest). In 'Automatic' mode the post selects the level based on operation stock: above 0.5 mm → level 1, below 0.05 mm → level 10, between 0.05–0.1 mm → level 7. Cancel with G05.1 Q0. AICC must be cancelled before changing the active smoothing level — always output G05.1 Q0 first, then re-enable with new R value.

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`

## Related tips

- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:3+tag:8)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:3+tag:5)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:3+tag:5)_
- [[ctrl-138|Hurco WinMax Profile milling with Max Offset]] _(category+op:3+tag:5)_
- [[ctrl-201|Brother High Accuracy Mode A/B/M298 — 6 smoothing levels for contour vs drilling]] _(category+op:3+tag:5)_

## Tags

#fanuc #aicc #smoothing #g05-1 #hsm #finishing #roughing #post-processor #operation-profiling #operation-roughing #operation-finishing #controller-fanuc
