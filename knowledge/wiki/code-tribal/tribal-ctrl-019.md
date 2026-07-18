---
name: tribal-ctrl-019
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["heidenhain", "tcpm", "5-axis", "tool-center-point", "tnc640"]
confidence: 90
source: "controller:heidenhain_5axis_programming"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-019.md
promoted_at: 2026-05-26T16:07:20.124Z
---

# Heidenhain TCPM (tool center point management) for 5-axis

Heidenhain's TCPM function (equivalent to Fanuc TCP/Siemens TRAORI) maintains the tool tip position during 5-axis tilting. Activate with: FUNCTION TCPM F TCP AXIS SPATIAL PATHCTRL AXIS. Key parameters: F TCP (tool center point mode), AXIS SPATIAL (spatial angle interpolation), PATHCTRL AXIS (path control). Unlike Fanuc, TCPM stays active until explicitly cancelled with FUNCTION RESET TCPM.

**Category:** programming
**Confidence:** 90
**Source:** controller:heidenhain_5axis_programming

## Related
- [[controller-knowledge-tips-ctrl-081|TNC 640 TCPM vs M128 for 5-axis tool orientation]]
- [[controller-knowledge-tips-ctrl-018|Heidenhain TNC 640 conversational programming (Klartext)]]
- [[controller-knowledge-tips-ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]]
- [[controller-knowledge-tips-ctrl-087|TNC 640 3D-ToolComp for tool radius compensation in 5-axis]]
- [[esprit-cam-tips-esp-166|B-Axis TCPM for Mill-Turn Compound Angles]]
