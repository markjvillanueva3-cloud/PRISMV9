---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-067
title: TRAORI 5-Axis Simultaneous Transformation
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "5-axis", "TRAORI", "simultaneous", "transformation", "orientation", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: ad12cb0ca5a832d10fd349e5d6f912de549307ce856ec3ff1c10bd793b64e5b9
mirror_ts: 2026-05-05T13:36:03.946Z
mirror_engine: TribalVaultPopulatorEngine
---

# TRAORI 5-Axis Simultaneous Transformation

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

TRAORI (TRAnsformation ORIentation) activates the 5-axis kinematic transformation for simultaneous 5-axis machining on SINUMERIK controllers. Unlike CYCLE800 (3+2 static), TRAORI enables continuous tool orientation changes during cutting. Syntax: TRAORI(n) where n selects the transformation number (configured in machine data). Related commands: TRAFOOF deactivates transformation; ORIAXES enables linear axis interpolation of orientation; ORIVECT enables great-circle (vector) interpolation for smoother orientation transitions. Orientation can be defined via: ORIEULER (Euler angles), ORIRPY (Roll-Pitch-Yaw), ORIVECT (direction vectors using A3/B3/C3), ORIPLANE (orientation in a plane), or ORIVIRT1/ORIVIRT2 (virtual orientation axes). LEAD and TILT parameters define tool inclination relative to the surface normal. TRAORI requires the 5-axis transformation option license and proper kinematic chain configuration in machine data ($MC_TRAFO_TYPE_n). 828D supports TRAORI with up to 4 interpolating axes; 840D sl and SINUMERIK ONE support full 5-axis simultaneous.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-012|Siemens TRAORI for 5-axis transformation]] _(category+op:1+tag:5)_
- [[ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]] _(category+op:1+tag:5)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:1+tag:5)_
- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(category+op:1+tag:5)_
- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+op:1+tag:5)_

## Tags

#controller #siemens #5-axis #traori #simultaneous #transformation #orientation #operation-5_axis #controller-siemens
