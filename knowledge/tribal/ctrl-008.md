---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-008
title: Fanuc tool center point control for 5-axis
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:fanuc_5axis_manual
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "tcp", "g43.4", "g43.5", "5-axis", "tool-center-point", "operation:5_axis", "controller:fanuc"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 5748bf439d0ebb206377c2b13285ee4c340b5de1189f7751ec0eebc4efa74fdc
mirror_ts: 2026-05-05T13:36:01.518Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc tool center point control for 5-axis

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:fanuc_5axis_manual`

## Tip

G43.4 (Type 1 TCP) and G43.5 (Type 2 TCP) enable tool center point control on Fanuc 31i-B5. G43.4 maintains the tool tip position while the rotary axes tilt — the control automatically compensates XYZ. G43.5 adds tool vector control for smoother 5-axis motion. Always specify tool geometry: G43.4 Hxx (H = tool length offset). Requires correct machine kinematics in parameters #14700-#14715.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:8)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:4)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:1+tag:4)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:1+tag:4)_
- [[ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]] _(category+op:1+tag:4)_

## Tags

#fanuc #tcp #g43-4 #g43-5 #5-axis #tool-center-point #operation-5_axis #controller-fanuc
