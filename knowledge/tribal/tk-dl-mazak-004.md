---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-004
title: G43.4/G43.5 tool tip point control (RTCP) for 5-axis on INTEGREX
category: programming
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:mazak-eia-integrex-iv@ch15
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "integrex", "rtcp", "g43.4", "5-axis", "tool-tip-control", "operation:milling", "operation:5_axis"]
material_groups: []
operation_types: ["milling", "5_axis"]
content_hash: 1ff119fb55f7de03c07160bc1e6c4690f1b987a988d9e30ec4259704ae2d8e51
mirror_ts: 2026-05-05T13:36:02.149Z
mirror_engine: TribalVaultPopulatorEngine
---

# G43.4/G43.5 tool tip point control (RTCP) for 5-axis on INTEGREX

**Category:** `programming` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mazak-eia-integrex-iv@ch15`

## Tip

G43.4 (Type 1) and G43.5 (Type 2) enable Rotary Tool Center Point control on multi-axis machines. When the B-axis rotates the tool, RTCP automatically compensates XYZ positions to keep the tool tip stationary on the workpiece surface. Without RTCP, rotating the B-axis would shift the cutting point. Critical for 5-axis simultaneous machining on INTEGREX machines where the milling spindle tilts via B-axis. Type 1 vs Type 2 differ in how the compensation vector is calculated relative to the rotary axis center.

## Applies to

- Operation types: `milling`, `5_axis`

## Related tips

- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(category+op:2+tag:3)_
- [[ctrl-109|Fidia Velocity Five and RTCP for 5-axis trajectory control]] _(category+op:2+tag:3)_
- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:4)_
- [[ctrl-171|Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup]] _(category+op:1+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:2)_

## Tags

#mazak #integrex #rtcp #g43-4 #5-axis #tool-tip-control #operation-milling #operation-5_axis
