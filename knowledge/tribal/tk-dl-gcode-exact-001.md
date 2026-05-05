---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-gcode-exact-001
title: G09 vs G61 vs G60: exact stop (one-shot vs modal) and anti-backlash for probing
category: programming
subcategory: probing_routine
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:CNCCookbook-G61-G64-G60
created_at: 2026-03-06
usage_count: 0
tags: ["G09", "G61", "G60", "G64", "exact-stop", "anti-backlash", "probing", "servo-settle", "operation:roughing", "operation:finishing", "operation:boring"]
material_groups: []
operation_types: ["roughing", "finishing", "boring"]
content_hash: 6ed00bb3c7a89015441652763550affd5fd3af4cb7abfce2a69fef65e1d57ad0
mirror_ts: 2026-05-05T13:36:01.488Z
mirror_engine: TribalVaultPopulatorEngine
---

# G09 vs G61 vs G60: exact stop (one-shot vs modal) and anti-backlash for probing

**Category:** `programming` · **Subcategory:** `probing_routine` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:CNCCookbook-G61-G64-G60`

## Tip

Exact stop modes: G09=one-shot (auto-cancels after one block, no cancel needed), G61=modal exact stop (persists until G64 cancels — forces servo error to zero before each block). G61 is NOT just a dwell — it forces the servo loop to fully settle the position error. G61 should NOT be used for roughing (wastes cycle time; finish pass exists to clean up roughing errors). G60=one-shot single-direction approach (anti-backlash) — forces machine to overshoot and return from one consistent direction. G60 is specified on EVERY line (not modal). Primary G60 use cases: probing operations (touch probe) and precision bore finishing where backlash would cause measurement/position error. G64=cutting mode (default) — enables corner blending/look-ahead for smooth motion. Note: not all controllers support G61; some silently ignore it.

## Applies to

- Operation types: `roughing`, `finishing`, `boring`

## Related tips

- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:3+tag:3)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:3+tag:3)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:2+tag:2)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:2+tag:2)_
- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+op:2+tag:2)_

## Tags

#g09 #g61 #g60 #g64 #exact-stop #anti-backlash #probing #servo-settle #operation-roughing #operation-finishing #operation-boring
