---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-081
title: TNC 640 TCPM vs M128 for 5-axis tool orientation
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "heidenhain", "5-axis", "TCPM", "M128", "tool-orientation", "operation:profiling", "operation:5_axis", "controller:heidenhain"]
material_groups: []
operation_types: ["profiling", "5_axis"]
content_hash: 59b644f74695b0c572bdedf4e6e9c37d26855d5a97611c0b52c95eebd2562976
mirror_ts: 2026-05-05T13:36:03.964Z
mirror_engine: TribalVaultPopulatorEngine
---

# TNC 640 TCPM vs M128 for 5-axis tool orientation

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

The TNC 640 offers TCPM (Tool Center Point Management) as the improved replacement for M128. TCPM prevents contour gouging during 5-axis simultaneous machining by maintaining the tool tip position when rotary axes move. Key difference: M128 is the legacy function from iTNC 530; TCPM adds configurable approach behavior (FUNCTION TCPM with options for AXIS POS, AXIS SPAT). Always use TCPM on TNC 640 — M128 still works but TCPM gives finer control over interpolation between start and end orientations. Deactivate with M129.

## Applies to

- Operation types: `profiling`, `5_axis`

## Related tips

- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:2+tag:3)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:2+tag:3)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:2+tag:3)_
- [[ctrl-040|Fidia C40 5-axis contouring specialization]] _(category+op:2+tag:3)_
- [[ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]] _(category+op:1+tag:5)_

## Tags

#controller #heidenhain #5-axis #tcpm #m128 #tool-orientation #operation-profiling #operation-5_axis #controller-heidenhain
