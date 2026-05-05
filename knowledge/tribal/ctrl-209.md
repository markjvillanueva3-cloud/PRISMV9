---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-209
title: Hurco WinMax M31 — rotary axis encoder reset prevents unwinding
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:cope_hurco_5axis_post_notes_2012
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m31", "encoder-reset", "rotary-axis", "5-axis", "unwinding", "program-header", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 1d53be8629f24b824bd86f7f88ddc7a20d4f62b6c0bde10dcd188e859d40dc84
mirror_ts: 2026-05-05T13:36:00.873Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax M31 — rotary axis encoder reset prevents unwinding

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:cope_hurco_5axis_post_notes_2012`

## Tip

M31 resets the rotary axis encoder to the current machine position. CRITICAL for 5-axis: without M31 at program start, rotary axes can 'unwind' when commanded to return to zero degrees. Example: if the A-axis physically sits at 0 degrees but the encoder accumulated 3600 degrees during prior work, commanding A0 without M31 first causes the axis to spin 10 full rotations. Always output M31 in the program header immediately after the program number before any positioning. Best practice: include M31 after every tool change and before program end (M30). The Hurco post template should output: %\n:0001\nM31 (Rotary Axes Encoder Reset)

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:6)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:5)_
- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+op:1+tag:5)_
- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:5)_
- [[ctrl-215|Hurco WinMax IJK tool vectors — 6 decimal places required, unitless, non-modal]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #m31 #encoder-reset #rotary-axis #5-axis #unwinding #program-header #operation-5_axis #machine-hurco
