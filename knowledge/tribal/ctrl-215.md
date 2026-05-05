---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-215
title: Hurco WinMax IJK tool vectors — 6 decimal places required, unitless, non-modal
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:cope_hurco_5axis_post_notes_2012
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "ijk", "tool-vector", "5-axis", "decimal-places", "unitless", "non-modal", "simultaneous", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 70fef11cda24496eff049906bc5ec23a068aea831fdea30db4fb70a63002d8e8
mirror_ts: 2026-05-05T13:36:00.877Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax IJK tool vectors — 6 decimal places required, unitless, non-modal

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:cope_hurco_5axis_post_notes_2012`

## Tip

IJK tool vector tokens for 5-axis simultaneous motion have critical requirements: (1) Output to 6 DECIMAL PLACES — 4 decimal places is insufficient and causes erratic movement or poor surface finishes. (2) IJK tokens are UNITLESS — they should remain unchanged when switching between inch and metric. Test by posting a process in both units; the IJK values must match exactly. (3) IJK tokens are NON-MODAL — they must be output on EVERY G1 line during simultaneous 5-axis motion. Example: G01 X-0.7471 Z3.0627 I-0.4877059 J-0.4906040 K0.7221154 F200.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-145|Hurco 5-axis IJK tool vector requirements — 6 decimal places]] _(category+op:1+tag:7)_
- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:6)_
- [[ctrl-217|Hurco WinMax G43.4 — toolpath linearization eliminates gouging on 5-axis moves]] _(category+op:1+tag:6)_
- [[ctrl-126|Hurco WinMax M140 — safe 5-axis retract along tool vector]] _(category+op:1+tag:6)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #ijk #tool-vector #5-axis #decimal-places #unitless #non-modal #simultaneous #operation-5_axis #machine-hurco
