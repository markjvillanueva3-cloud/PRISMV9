---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-210
title: Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: anti_pattern
confidence: 95
source: controller:cope_hurco_5axis_post_notes_2012
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "5-axis", "safety-line", "g17", "g18", "g19", "g68.2", "transform-plane", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: e308d1ba9b26648defe0283d0e171506680e9995e0bae5a5166e30837341051e
mirror_ts: 2026-05-05T13:36:00.874Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:cope_hurco_5axis_post_notes_2012`

## Tip

DO NOT call G17, G18, or G19 plane designations in the safety line when programming 5-axis on WinMax. Using plane codes causes problems with Transform Planes (G68.2) and 5-axis simultaneous motion. The correct WinMax 5-axis safety line is: G0 G20 G40 G80 G54 G90 (no plane code). G40 cancels cutter comp, G80 cancels canned cycles, G54 sets WCS, G90 sets absolute mode. If your CAM post outputs G17 in the safety line for 5-axis work, modify the post to suppress it. The control defaults to G17 but Transform Planes override this internally.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:6)_
- [[ctrl-220|Hurco WinMax rotary axis settings — ISO Standard YES, Tilt Axis Preference NEGATIVE]] _(category+op:1+tag:6)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:5)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:5)_
- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #5-axis #safety-line #g17 #g18 #g19 #g68-2 #transform-plane #operation-5_axis #machine-hurco
