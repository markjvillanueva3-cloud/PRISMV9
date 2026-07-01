---
name: tribal-esp-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "profile-mapping", "transition", "point-correspondence"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-160.md
promoted_at: 2026-06-09T22:31:16.250Z
---

# Wire EDM Upper/Lower Profile Transition for Complex 4-Axis Parts

For 4-axis wire EDM parts where the top and bottom profiles are completely different shapes (e.g., round at top, square at bottom), ESPRIT uses a point-mapping algorithm to correlate points between profiles. Under Wire EDM → 4-Axis → Profile Mapping, choose: automatic (ESPRIT matches points by normalized arc length), manual (you define corresponding points), or hybrid. Add manual correspondence points at critical features — corners, tangent points, arc centers — to prevent the wire from taking unexpected paths between profiles. Always simulate the full 4-axis cut with wire visualization enabled to verify no twisting or inverting.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:esprit-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
- [[bobcad-cam-tips-bc-154|BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[cimatron-cam-tips-cim-149|Wire EDM Programming for Mold Inserts]]
