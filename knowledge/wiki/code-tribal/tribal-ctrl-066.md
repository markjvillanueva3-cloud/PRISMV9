---
name: tribal-ctrl-066
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "5-axis", "CYCLE800", "swivel", "3+2", "indexed"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-066.md
promoted_at: 2026-06-09T22:31:16.147Z
---

# CYCLE800 Swivel Plane for 3+2 Axis Positioning

CYCLE800 is Siemens' proprietary cycle for 3+2 axis (indexed 5-axis) machining. It transforms the working plane by rotating the coordinate system to match the tilted work surface. Key parameters: retraction mode (0=none, 1=Z retract, 2=Z then XY, 3=max tool direction, 4=incremental tool direction), swivel data record name (machine-specific kinematic configuration), and rotation mode (new or additive). The axis sequence parameter controls posting order: 57(ABC), 39(CAB), 27(CBA), 45(ACB), 30(BCA), 54(BAC). Critical rule: store angles in coordinate rotation and leave numerical B/C work offset at 0. CYCLE800 handles FRAME calculations, tool tip tracking (TCPM/RTCP), and safe retraction automatically. Available on 840D sl, 828D, and SINUMERIK ONE. CAM post processors must output the correct swivel data record name matching the machine's kinematic table configured during commissioning.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
- [[controller-knowledge-tips-ctrl-078|SINUMERIK Post-Processor Configuration Essentials]]
- [[controller-knowledge-tips-ctrl-101|Hurco Transform Plane for 3+2 and 5-axis positioning]]
