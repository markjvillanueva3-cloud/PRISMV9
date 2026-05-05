---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-164
title: Siemens 840D FFWON / FFWOF — feed-forward control for contour accuracy
category: programming
subcategory: probing_routine
domain: controller_specific
knowledge_type: anti_pattern
confidence: 87
source: controller:siemens_840d_sinumerik_manual
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "ffwon", "ffwof", "feed-forward", "contour-accuracy", "hsc", "following-error", "md32400", "operation:profiling", "operation:boring", "operation:hsm", "controller:siemens"]
material_groups: []
operation_types: ["profiling", "boring", "hsm"]
content_hash: f1b43642ed79cdcd6f53e2b6d66b0620c2bf429a572acac92b237100bd1ba689
mirror_ts: 2026-05-05T13:36:02.604Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D FFWON / FFWOF — feed-forward control for contour accuracy

**Category:** `programming` · **Subcategory:** `probing_routine` · **Domain:** `controller_specific`

**Confidence:** `87` · **Source:** `controller:siemens_840d_sinumerik_manual`

## Tip

FFWON activates feed-forward control on position servo loops; FFWOF deactivates it. Feed-forward eliminates the position lag (following error) at high feedrates, dramatically improving contour accuracy on corners and curves. On the 840D, velocity feed-forward (FFWON FTYPE=1) pre-compensates for axis inertia. Acceleration feed-forward (FFWON FTYPE=2) also compensates during acc/dec phases. When to use: FFWON before high-speed HSC sections; FFWOF for slow-feed precision boring or probing where overshoot is a concern. Note: CYCLE832 activates feed-forward internally — calling FFWON explicitly may conflict; follow machine builder guidance. Key machine data: MD 32400 VELO_FFW_WEIGHT (velocity FF weighting, 0.0-1.0), MD 32420 ACC_FFW_WEIGHT. These are set during commissioning — do not change without ballbar testing before and after.

## Applies to

- Operation types: `profiling`, `boring`, `hsm`

## Related tips

- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:2+tag:6)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:2+tag:3)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:2+tag:3)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:2+tag:2)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:2+tag:2)_

## Tags

#siemens #840d #ffwon #ffwof #feed-forward #contour-accuracy #hsc #following-error #md32400 #operation-profiling #operation-boring #operation-hsm #controller-siemens
