---
name: tribal-ctrl-081
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "heidenhain", "5-axis", "TCPM", "M128", "tool-orientation"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-081.md
promoted_at: 2026-06-09T22:31:16.151Z
---

# TNC 640 TCPM vs M128 for 5-axis tool orientation

The TNC 640 offers TCPM (Tool Center Point Management) as the improved replacement for M128. TCPM prevents contour gouging during 5-axis simultaneous machining by maintaining the tool tip position when rotary axes move. Key difference: M128 is the legacy function from iTNC 530; TCPM adds configurable approach behavior (FUNCTION TCPM with options for AXIS POS, AXIS SPAT). Always use TCPM on TNC 640 — M128 still works but TCPM gives finer control over interpolation between start and end orientations. Deactivate with M129.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]]
- [[controller-knowledge-tips-ctrl-087|TNC 640 3D-ToolComp for tool radius compensation in 5-axis]]
- [[controller-knowledge-tips-ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
