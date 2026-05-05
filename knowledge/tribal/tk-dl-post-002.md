---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-002
title: Use G01 at high feed instead of G00 for multi-axis rapids — prevents axis stall
category: safety
domain: document_learned
knowledge_type: workaround
confidence: 92
source: document:autodesk-post-processor-guide@ch5-highFeedMapping
created_at: 2026-03-06
usage_count: 0
tags: ["multi-axis", "rapid", "g00", "high-feed", "collision", "interpolation", "5-axis", "operation:5_axis"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 5c2c52a5c44e3803a0f7b8b859c1ff989546235b6add1a19015a9910d2c692dc
mirror_ts: 2026-05-05T13:36:01.062Z
mirror_engine: TribalVaultPopulatorEngine
---

# Use G01 at high feed instead of G00 for multi-axis rapids — prevents axis stall

**Category:** `safety` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:autodesk-post-processor-guide@ch5-highFeedMapping`

## Tip

On multi-axis machines, G00 rapid moves each axis at its own maximum rate independently (not interpolated). This means the tool can reach XY position before Z clears the part, causing collision. Set highFeedMapping to map multi-axis rapids to G01 at maximum feedrate (e.g. 15000mm/min). This forces interpolated motion where all axes arrive simultaneously. Single-axis Z retracts can still use G00 safely. Most 5-axis post processors default to this behavior.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[mc-012|Define toolholder precisely for 5-axis collision checking]] _(category+op:1+tag:3)_
- [[tk-dl-sim5x-002|5-axis gouge avoidance: 4 check sets, tilt/retract/trim strategies, pole singularity handling]] _(category+op:1+tag:2)_
- [[ctrl-163|Siemens 840D COMPCAD — collision and component protection in simultaneous 5-axis]] _(category+op:1+tag:2)_
- [[mc-013|Use tilt axis limits to protect 5-axis parts from gouges]] _(category+op:1+tag:2)_
- [[mc-015|Multiaxis safe zone provides 5-axis collision buffer]] _(category+op:1+tag:2)_

## Tags

#multi-axis #rapid #g00 #high-feed #collision #interpolation #5-axis #operation-5_axis
