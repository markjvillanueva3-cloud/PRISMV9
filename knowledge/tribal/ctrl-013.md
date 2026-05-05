---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-013
title: Siemens COMPCAD vs COMPCURV compressor modes
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 88
source: controller:siemens_compressor_docs
created_at: 2026-03-07
usage_count: 0
tags: ["siemens", "compcad", "compcurv", "compressor", "hsm", "toolpath", "operation:hsm", "controller:siemens"]
material_groups: []
operation_types: ["hsm"]
content_hash: 552e967e7ca7b7831d81bd5825422b607263a3423b2bdc347b5418a9fa342803
mirror_ts: 2026-05-05T13:36:02.213Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens COMPCAD vs COMPCURV compressor modes

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:siemens_compressor_docs`

## Tip

SINUMERIK has two toolpath compressors: COMPCAD converts G1 segments into polynomial splines (best for CAM-generated paths), COMPCURV preserves the original path better for hand-programmed contours. For HSM with CAM output, always use COMPCAD — it can reduce block count 90% while maintaining tolerance. Set tolerance with G642 or CYCLE832. COMPOF disables compression.

## Applies to

- Operation types: `hsm`

## Related tips

- [[ctrl-011|Siemens CYCLE832 high-speed machining settings]] _(category+op:1+tag:4)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:1+tag:3)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:1+tag:3)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:1+tag:3)_
- [[ctrl-164|Siemens 840D FFWON / FFWOF — feed-forward control for contour accuracy]] _(category+op:1+tag:3)_

## Tags

#siemens #compcad #compcurv #compressor #hsm #toolpath #operation-hsm #controller-siemens
