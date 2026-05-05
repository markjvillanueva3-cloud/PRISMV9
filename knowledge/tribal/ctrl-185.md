---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-185
title: Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: anti_pattern
confidence: 94
source: controller:okuma_osp_multiaxis_programming
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "call-oo88", "fixture-offset", "3+2", "tilted-workplane", "multi-axis", "macro", "p300", "p200", "operation:5_axis", "machine:Okuma", "controller:okuma"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 855adfdbfe225f39689010b9983b2fb242d303a03ff75a32a515ef7167b4105c
mirror_ts: 2026-05-05T13:36:00.911Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:okuma_osp_multiaxis_programming`

## Tip

CALL OO88 is Okuma's macro-based tilted work plane system for 3+2 machining on OSP-P200 and P300. Syntax: CALL OO88 P1=H51 (activates tilted coordinate using fixture offset H51). Cancel: CALL OO88 P1=H0. CRITICAL: O0088 is a factory-reserved system macro — never program a user subprogram to O0088 or it overwrites the tilted plane function, causing immediate post-activation errors. Standard sequence: (1) Position rotary axes to desired angle, (2) M10/M26 to clamp 4th/5th axis, (3) CALL OO88 P1=H[n], (4) Machine features in tilted frame using G15 H[offset] for zero-point, (5) CALL OO88 P1=H0 to cancel, (6) M11/M27 to unclamp axes. Autodesk Fusion post: 'Tilted work plane method' = 'OO88', 'Fixture offset WCS' = 51. Requires 5-axis option license. On P300 firmware R01w+, prefer G605 (ctrl-186) for higher accuracy.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-186|Okuma G605 Dynamic Fixture Offset — native 3+2 tilted work plane for OSP-P300/P500]] _(category+tag:7)_
- [[ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]] _(category+op:1+tag:5)_
- [[ctrl-183|Okuma CAS M510/M511 — Collision Avoidance System disable/enable for 5-axis machining]] _(category+op:1+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:1+tag:4)_
- [[ctrl-187|Okuma G445/G446 Tool Posture Offset Control (TPOC) — 5-axis TCP accuracy compensation]] _(category+op:1+tag:4)_

## Tags

#okuma #osp #call-oo88 #fixture-offset #3-2 #tilted-workplane #multi-axis #macro #p300 #p200 #operation-5_axis #machine-okuma #controller-okuma
