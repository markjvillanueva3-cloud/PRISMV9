---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-087
title: TNC 640 3D-ToolComp for tool radius compensation in 5-axis
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "heidenhain", "5-axis", "tool-compensation", "3D-ToolComp", "mold", "operation:finishing", "operation:5_axis", "controller:heidenhain"]
material_groups: []
operation_types: ["finishing", "5_axis"]
content_hash: 353bd15a3a321473833ff98830a09832cf087a10ce2e717fe222fe4192a70f16
mirror_ts: 2026-05-05T13:36:03.969Z
mirror_engine: TribalVaultPopulatorEngine
---

# TNC 640 3D-ToolComp for tool radius compensation in 5-axis

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

3D-ToolComp compensates for actual vs nominal tool radius during 3D surface finishing. Unlike standard 2D tool radius compensation (RL/RR), 3D-ToolComp uses surface normal vectors from the CAM system (output as NX/NY/NZ in ISO or as 3D-ROT in Klartext). This enables automatic re-machining with a slightly different tool diameter without re-posting from CAM. Setup: define actual tool radius in tool table (DR column = deviation from nominal). The TNC applies the delta automatically along the surface normal. Essential for tight-tolerance mold finishing.

## Applies to

- Operation types: `finishing`, `5_axis`

## Related tips

- [[ctrl-109|Fidia Velocity Five and RTCP for 5-axis trajectory control]] _(category+op:2+tag:4)_
- [[ctrl-145|Hurco 5-axis IJK tool vector requirements — 6 decimal places]] _(category+op:2+tag:3)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:2+tag:3)_
- [[ctrl-127|Hurco WinMax M200 — tilt axis preference for 5-axis]] _(category+op:2+tag:3)_
- [[ctrl-207|Mitsubishi OMR-DD (Optimum Machine Response Direct Drive): setup and surface finish impact]] _(category+op:2+tag:3)_

## Tags

#controller #heidenhain #5-axis #tool-compensation #3d-toolcomp #mold #operation-finishing #operation-5_axis #controller-heidenhain
