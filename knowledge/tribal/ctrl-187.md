---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-187
title: Okuma G445/G446 Tool Posture Offset Control (TPOC) — 5-axis TCP accuracy compensation
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: quote_correction
confidence: 90
source: controller:okuma_osp_5axis_tuning_guide
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "tpoc", "g445", "g446", "5-axis", "tcp", "tool-posture", "accuracy", "calibration", "compensation", "operation:5_axis", "machine:Okuma"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 14499d77686907c2c644655516f8de022af08561202b00371dd8fc319ced59f5
mirror_ts: 2026-05-05T13:36:01.535Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G445/G446 Tool Posture Offset Control (TPOC) — 5-axis TCP accuracy compensation

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:okuma_osp_5axis_tuning_guide`

## Tip

TPOC (Tool Posture Offset Control) compensates for tool center point positional errors during 5-axis simultaneous machining. Enable: G445 (in block before TCP-active moves). Cancel: G446. TPOC applies real-time correction based on actual tool geometry and calibration data from Okuma's 5-Axis Auto Tuning System — it corrects for spindle tilt, tool runout, and TCP offset drift with angle. When TPOC is critical: tools longer than 100 mm on A/C table machines, tolerances tighter than ±0.01 mm on inclined surfaces, or after any spindle bearing replacement. Without TPOC, a 0.1 mm TCP offset error at 30° tilt produces ~0.05 mm Z-error on the inclined face. Autodesk Fusion post: 'Enable Tool Posture Offset Control' = true adds G445/G446 automatically. Prerequisites: 5-axis option license and a completed 5-axis calibration (re-run calibration after any spindle or rotary axis maintenance).

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-183|Okuma CAS M510/M511 — Collision Avoidance System disable/enable for 5-axis machining]] _(category+op:1+tag:6)_
- [[ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]] _(category+op:1+tag:5)_
- [[ctrl-185|Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining]] _(category+op:1+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:1+tag:4)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:3)_

## Tags

#okuma #osp #tpoc #g445 #g446 #5-axis #tcp #tool-posture #accuracy #calibration #compensation #operation-5_axis #machine-okuma
