---
name: tribal-ctrl-087
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "heidenhain", "5-axis", "tool-compensation", "3D-ToolComp", "mold"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-087.md
promoted_at: 2026-06-09T22:31:16.152Z
---

# TNC 640 3D-ToolComp for tool radius compensation in 5-axis

3D-ToolComp compensates for actual vs nominal tool radius during 3D surface finishing. Unlike standard 2D tool radius compensation (RL/RR), 3D-ToolComp uses surface normal vectors from the CAM system (output as NX/NY/NZ in ISO or as 3D-ROT in Klartext). This enables automatic re-machining with a slightly different tool diameter without re-posting from CAM. Setup: define actual tool radius in tool table (DR column = deviation from nominal). The TNC applies the delta automatically along the surface normal. Essential for tight-tolerance mold finishing.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
- [[controller-knowledge-tips-ctrl-081|TNC 640 TCPM vs M128 for 5-axis tool orientation]]
- [[controller-knowledge-tips-ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
