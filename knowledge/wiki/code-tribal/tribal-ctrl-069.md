---
name: tribal-ctrl-069
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "tool-compensation", "CUT2D", "CUT3DC", "CUT3DF", "5-axis", "post-processor"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-069.md
promoted_at: 2026-06-09T22:31:16.147Z
---

# CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes

SINUMERIK uses proprietary tool compensation modes for multi-axis machining that differ from standard ISO G41/G42: CUT2D applies 2D tool radius compensation when tool axis is perpendicular to the working plane (standard Z-axis orientation at B0C0). CUT2DF extends 2D compensation to work in tilted/swiveled planes (when a FRAME rotation is active), maintaining compensation in the rotated coordinate system. CUT3DC (3D Circumference) provides continuous 3D cutter radius compensation for simultaneous 5-axis peripheral milling, accounting for changing tool orientation throughout the path. CUT3DF (3D Face) handles 3D compensation for face milling operations. CUT3DFS (3D Face Side) and CUT3DFF (3D Face Front) provide additional face milling variants. ISD (Insertion depth) parameter defines how deep the tool engages, critical for CUT3DC calculations. These modes are essential for CAM post-processor configuration: most 5-axis simultaneous programs from hyperMILL, NX, or Mastercam should output CUT3DC for side cutting or CUT3DF for face cutting operations. 828D supports CUT2D/CUT2DF/CUT3DC/CUT3DF; full 3D compensation with ISD requires 840D sl or SINUMERIK ONE.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
