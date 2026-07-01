---
name: tribal-ctrl-067
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "5-axis", "TRAORI", "simultaneous", "transformation", "orientation"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-067.md
promoted_at: 2026-06-09T22:31:16.147Z
---

# TRAORI 5-Axis Simultaneous Transformation

TRAORI (TRAnsformation ORIentation) activates the 5-axis kinematic transformation for simultaneous 5-axis machining on SINUMERIK controllers. Unlike CYCLE800 (3+2 static), TRAORI enables continuous tool orientation changes during cutting. Syntax: TRAORI(n) where n selects the transformation number (configured in machine data). Related commands: TRAFOOF deactivates transformation; ORIAXES enables linear axis interpolation of orientation; ORIVECT enables great-circle (vector) interpolation for smoother orientation transitions. Orientation can be defined via: ORIEULER (Euler angles), ORIRPY (Roll-Pitch-Yaw), ORIVECT (direction vectors using A3/B3/C3), ORIPLANE (orientation in a plane), or ORIVIRT1/ORIVIRT2 (virtual orientation axes). LEAD and TILT parameters define tool inclination relative to the surface normal. TRAORI requires the 5-axis transformation option license and proper kinematic chain configuration in machine data ($MC_TRAFO_TYPE_n). 828D supports TRAORI with up to 4 interpolating axes; 840D sl and SINUMERIK ONE support full 5-axis simultaneous.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-012|Siemens TRAORI for 5-axis transformation]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
- [[controller-knowledge-tips-ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]]
