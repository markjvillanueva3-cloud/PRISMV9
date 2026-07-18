---
name: tribal-ctrl-008
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "tcp", "g43.4", "g43.5", "5-axis", "tool-center-point"]
confidence: 90
source: "controller:fanuc_5axis_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-008.md
promoted_at: 2026-05-26T16:07:20.112Z
---

# Fanuc tool center point control for 5-axis

G43.4 (Type 1 TCP) and G43.5 (Type 2 TCP) enable tool center point control on Fanuc 31i-B5. G43.4 maintains the tool tip position while the rotary axes tilt — the control automatically compensates XYZ. G43.5 adds tool vector control for smoother 5-axis motion. Always specify tool geometry: G43.4 Hxx (H = tool length offset). Requires correct machine kinematics in parameters #14700-#14715.

**Category:** programming
**Confidence:** 90
**Source:** controller:fanuc_5axis_manual

## Related
- [[gibbscam-cam-tips-gc-155|B-axis tool center point control (TCP) maintains accurate cutter contact]]
- [[controller-knowledge-tips-ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]]
- [[controller-knowledge-tips-ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]]
- [[controller-knowledge-tips-ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
