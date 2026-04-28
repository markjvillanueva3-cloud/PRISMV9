---
id: "ctrl-012"
title: "Siemens TRAORI for 5-axis transformation"
source: "controller:siemens_5axis_manual"
confidence: 90
category: "programming"
tags: ["siemens", "sinumerik", "traori", "5-axis", "transformation"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.162Z
---

# Siemens TRAORI for 5-axis transformation

TRAORI activates 5-axis coordinate transformation on SINUMERIK 840D sl. Syntax: TRAORI(n) where n=transformation number (1-4 for multiple kinematic chains). Must be followed by tool orientation commands: A3=, B3=, C3= (direction cosines) or LEAD/TILT angles. Cancel with TRAFOOF. Unlike Fanuc G43.4, TRAORI handles both table-table and head-head kinematics through the same command — the kinematic model is in machine data.

**Category:** programming
**Confidence:** 90
**Source:** controller:siemens_5axis_manual

## Related
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-011|Siemens CYCLE832 high-speed machining settings]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
