---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-022
title: Haas NGC Setting 191 for smoothing tolerance
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 92
source: controller:haas_ngc_settings
created_at: 2026-03-07
usage_count: 0
tags: ["haas", "ngc", "setting-191", "smoothing", "surface-finish", "operation:profiling", "operation:finishing", "machine:Haas", "controller:fanuc", "controller:siemens", "controller:haas"]
material_groups: []
operation_types: ["profiling", "finishing"]
content_hash: 48f75291cec8684ee989fff83e8b4ec9be19fdb64964e3ea4eb664e6625d337f
mirror_ts: 2026-05-05T13:36:01.087Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas NGC Setting 191 for smoothing tolerance

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:haas_ngc_settings`

## Tip

Setting 191 (Smoothing Tolerance) on Haas NGC controls the contouring smoothness. Default is 0.05mm — too coarse for finish passes. Set to 0.005-0.01mm for finishing. This is Haas's equivalent of Fanuc's AICC or Siemens CYCLE832. Higher values = faster cycle time but visible faceting. Lower values = smoother finish but potential servo lag at high feed rates. Critical for 3D surfacing.

## Applies to

- Operation types: `profiling`, `finishing`

## Related tips

- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+op:1+tag:8)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:2+tag:6)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:2+tag:5)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:2+tag:5)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:2+tag:4)_

## Tags

#haas #ngc #setting-191 #smoothing #surface-finish #operation-profiling #operation-finishing #machine-haas #controller-fanuc #controller-siemens #controller-haas
