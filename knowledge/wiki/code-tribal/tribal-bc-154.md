---
name: tribal-bc-154
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "taper", "top-bottom-profile", "progressive-die"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-154.md
promoted_at: 2026-06-09T22:31:15.969Z
---

# BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles

BobCAD's 4-axis wire EDM supports independent top and bottom profiles for complex taper cuts. Select the bottom profile (XY) and top profile (UV) separately — BobCAD interpolates the wire between them. For progressive dies with tapered clearance, the die face is the bottom profile and the relief is the top profile, typically 0.5-2° per side. Maximum taper angle depends on workpiece thickness and machine UV travel. At 100mm thickness, most machines achieve 15-20° taper. Verify that corresponding profile segments have the same entity count — mismatched segment counts cause wire path errors.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[cimatron-cam-tips-cim-149|Wire EDM Programming for Mold Inserts]]
- [[edgecam-cam-tips-ec-049|Wire EDM 4-Axis Taper Cutting]]
