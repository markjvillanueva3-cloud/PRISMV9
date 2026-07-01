---
name: tribal-ctrl-101
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "hurco", "transform-plane", "5-axis", "3+2", "RTCP"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-101.md
promoted_at: 2026-06-09T22:31:16.156Z
---

# Hurco Transform Plane for 3+2 and 5-axis positioning

Hurco's Transform Plane feature enables 3+2 axis machining through conversational programming — no CAM-posted RTCP code needed. Set Transform Plane=Yes in a rotary data block to machine features on angled faces. The control handles all coordinate transformation internally. For full 5-axis simultaneous, WinMax supports standard G-code with RTCP (G234 on Hurco). GOTCHA: Transform Plane works differently from Heidenhain's tilted working plane (PLANE SPATIAL) or Fanuc's G68.2 — post processor must be Hurco-specific. Fanuc-posted 5-axis code will NOT run correctly on Hurco without post modification.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-109|Fidia Velocity Five and RTCP for 5-axis trajectory control]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
