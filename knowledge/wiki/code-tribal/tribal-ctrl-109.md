---
name: tribal-ctrl-109
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fidia", "5-axis", "velocity-five", "RTCP", "DYNA"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-109.md
promoted_at: 2026-06-09T22:31:16.158Z
---

# Fidia Velocity Five and RTCP for 5-axis trajectory control

Fidia's Velocity Five is a multi-axis trajectory control technology with dynamic-selectable roughing/finishing parameters (DYNA). It reduces finish milling time on 3D profiles by 15-20% and roughing by 30-40% compared to standard mode. The RTCP (Rotary Tool Center Point) function manages tool-length compensation in 3D space for bi-rotary heads, roto-tilting tables, and combined configurations. With RTCP active, program the toolpath without considering head pivot geometry — the control inserts compensations from the NC tool table at runtime. The C40 supports up to 10,000 tools with 16-character alphanumeric IDs. ISOGRAPH CAD/CAM is integrated for 2.5D programming directly on the control. Use DYNA parameter sets to switch between aggressive roughing dynamics and smooth finishing dynamics within the same program.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-101|Hurco Transform Plane for 3+2 and 5-axis positioning]]
- [[controller-knowledge-tips-ctrl-108|Fidia C40 Vision ViMill real-time collision avoidance for 5-axis]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
