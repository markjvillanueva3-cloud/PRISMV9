---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-101
title: Hurco Transform Plane for 3+2 and 5-axis positioning
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "hurco", "transform-plane", "5-axis", "3+2", "RTCP", "operation:5_axis", "machine:Hurco", "controller:fanuc", "controller:heidenhain"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 7fdc6133bf2274e6658af8e2f60117a589ca984b71e5498e4e3282b796c3a83c
mirror_ts: 2026-05-05T13:36:03.984Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco Transform Plane for 3+2 and 5-axis positioning

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Hurco's Transform Plane feature enables 3+2 axis machining through conversational programming — no CAM-posted RTCP code needed. Set Transform Plane=Yes in a rotary data block to machine features on angled faces. The control handles all coordinate transformation internally. For full 5-axis simultaneous, WinMax supports standard G-code with RTCP (G234 on Hurco). GOTCHA: Transform Plane works differently from Heidenhain's tilted working plane (PLANE SPATIAL) or Fanuc's G68.2 — post processor must be Hurco-specific. Fanuc-posted 5-axis code will NOT run correctly on Hurco without post modification.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+op:1+tag:5)_
- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+op:1+tag:5)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:4)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:4)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:4)_

## Tags

#controller #hurco #transform-plane #5-axis #3-2 #rtcp #operation-5_axis #machine-hurco #controller-fanuc #controller-heidenhain
