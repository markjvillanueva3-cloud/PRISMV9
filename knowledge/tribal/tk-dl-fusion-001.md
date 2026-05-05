---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-fusion-001
title: RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work
category: programming
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:Fusion360-Skill-Roadmap
created_at: 2026-03-06
usage_count: 0
tags: ["RTCP", "TCPC", "5-axis", "compensation", "gauge-length", "kinematics", "Fanuc-G43.4", "Siemens-TRAORI", "operation:5_axis", "tool:unknown", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 515380bcb8956f27cfd3aab5bb7a6f712d4f275b1c9ec97c29d18cbc33a087f0
mirror_ts: 2026-05-05T13:36:01.069Z
mirror_engine: TribalVaultPopulatorEngine
---

# RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work

**Category:** `programming` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:Fusion360-Skill-Roadmap`

## Tip

Rotary Tool Center Point (RTCP) / Tool Center Point Control (TCPC) compensates for the linear axis movements needed when rotary axes tilt the tool. Without RTCP, tilting the tool moves the TCP off-target. Compensation formulas for table-table (BC) kinematics: ΔX = L×sin(B)×cos(C), ΔY = L×sin(B)×sin(C), ΔZ = L×(1-cos(B)), where L = gauge length (spindle face to tool tip). For head-head (AC): ΔX = L×sin(A), ΔY = -L×sin(C)×cos(A), ΔZ = L×(1-cos(A)×cos(C)). RTCP must be enabled on the controller (Fanuc: G43.4/G43.5, Siemens: TRAORI, Heidenhain: M128/FUNCTION TCPM). CRITICAL: gauge length must be measured accurately — 0.1mm error causes 0.1mm tool tip error at 45° tilt.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]] _(category+op:1+tag:5)_
- [[ctrl-101|Hurco Transform Plane for 3+2 and 5-axis positioning]] _(category+op:1+tag:5)_
- [[ctrl-012|Siemens TRAORI for 5-axis transformation]] _(category+op:1+tag:4)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:3)_
- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:3)_

## Tags

#rtcp #tcpc #5-axis #compensation #gauge-length #kinematics #fanuc-g43-4 #siemens-traori #operation-5_axis #tool-unknown #controller-fanuc #controller-siemens #controller-heidenhain
