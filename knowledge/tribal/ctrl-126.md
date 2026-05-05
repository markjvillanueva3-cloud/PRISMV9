---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-126
title: Hurco WinMax M140 — safe 5-axis retract along tool vector
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 93
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m140", "5-axis", "retract", "tool-vector", "safety", "collision-avoidance", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 152e1f2b34b817527bd0e46b38dcee0845183514f520faa2d865387892f6ef76
mirror_ts: 2026-05-05T13:36:00.967Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax M140 — safe 5-axis retract along tool vector

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:winmax_intro_workbook`

## Tip

M140 retracts the Z-axis along the tool vector (not machine Z) to a safe position. Critical for 5-axis work where the tool may be tilted — a standard G28 Z0 would move in machine coordinates and could cause collision. Use M140 before any rotary repositioning in 5-axis programs. The retract distance is set in machine parameters. Sequence for 5-axis reposition: M140 (safe retract), M126 (shortest path), G0 A_ B_ (rotary move), then G43.4 H_ (reestablish TCP).

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:8)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:6)_
- [[ctrl-215|Hurco WinMax IJK tool vectors — 6 decimal places required, unitless, non-modal]] _(category+op:1+tag:6)_
- [[ctrl-212|Hurco WinMax G53 Z0 vs G91 G28 Z0 — machine coordinate retract]] _(category+op:1+tag:6)_
- [[ctrl-143|Hurco G8.2 ASR — Automatic Safe Repositioning for 5-axis]] _(category+op:1+tag:6)_

## Tags

#hurco #winmax #m140 #5-axis #retract #tool-vector #safety #collision-avoidance #operation-5_axis #machine-hurco
