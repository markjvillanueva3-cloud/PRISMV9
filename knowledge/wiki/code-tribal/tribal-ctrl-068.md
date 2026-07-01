---
name: tribal-ctrl-068
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "5-axis", "TOROT", "TOFRAME", "TCARR", "tool-orientation", "post-processor"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-068.md
promoted_at: 2026-06-09T22:31:16.147Z
---

# TOROT, TOFRAME, and TCARR Tool Orientation Commands

SINUMERIK provides specialized commands for tool orientation management in 5-axis machining: TOROT activates tool orientation tracking, rotating the coordinate frame to align with the current tool direction. When TOROT is active, XY moves occur in the plane perpendicular to the tool, enabling 2D operations (drilling, tapping) at arbitrary tool angles. TOFRAME generates a complete coordinate frame (FRAME) based on the current tool orientation, useful for subsequent 2D machining cycles at the tilted position. TCARR (Tool CARRier) manages orientable toolholder data, storing the angular offsets of angled toolholders. The system variable $TC_CARR1[n] through $TC_CARR23[n] define the toolholder kinematics. TOFFR/TOFFL/TOFFLR provide tool orientation offsets: TOFFL for lead angle offset, TOFFR for tilt angle offset. These commands work in conjunction with TRAORI and are essential for post-processor development. DMG MORI machines commonly use TOROT after CYCLE800 for 3+2 operations, while GROB machines often require specific TCARR configurations for their horizontal spindle + swivel table kinematics.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
