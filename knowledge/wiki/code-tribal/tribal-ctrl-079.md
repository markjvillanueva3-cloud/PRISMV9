---
name: tribal-ctrl-079
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "TRANSMIT", "TRACYL", "TRAANG", "transformation", "turning", "mill-turn"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-079.md
promoted_at: 2026-06-09T22:31:16.150Z
---

# TRANSMIT, TRACYL, and Special Coordinate Transformations

SINUMERIK provides proprietary coordinate transformations beyond standard 5-axis: **TRANSMIT** enables face-end machining on turning centers by converting XY Cartesian programming into radial + C-axis rotary motion. Allows milling contours on the face of a turned part using standard G-code XY moves. The CNC automatically computes C-axis rotation and X-axis radial movement. Pole avoidance ($MA_TRANSMIT_POLE_LIMIT) prevents singularity at center. **TRACYL** (Transformation Cylinder) maps XY planar programming onto a cylinder surface, enabling milling of grooves, pockets, and contours on cylindrical surfaces using C-axis rotation + Z-axis linear motion. Groove depth is controlled by the radial axis. **TRAANG** (Transformation Angle) compensates for inclined linear axes (e.g., B-axis on Swiss-type lathes, or Y-axis realized through compound slide angles). These transformations allow programming in a simple Cartesian coordinate system while the CNC handles the complex non-linear axis coordination. All three are available on 840D sl, SINUMERIK ONE, and 828D (with limitations on 828D). Common machine applications: TRANSMIT on DMG MORI CTX/NTX for cross-drilling and milling; TRACYL on Index multi-spindle lathes for cam groove cutting.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-060|Fanuc 0i-TF turning-specific canned cycles]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
