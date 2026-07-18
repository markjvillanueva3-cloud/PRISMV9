---
name: tribal-bc-062
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "taper", "uv-guides", "variable-taper"]
confidence: 88
source: "web:bobcad-wire-edm-4axis"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-062.md
promoted_at: 2026-06-09T22:31:15.947Z
---

# 4-Axis Wire EDM Taper with Independent UV Guides

BobCAD 4-axis wire EDM supports independent upper (UV) and lower (XY) guide profiles for taper and variable-taper cuts. Synchronize profiles by matching point counts. For constant taper, specify the angle and reference plane (top, bottom, mid-stock). Maximum reliable taper depends on stock height and machine kinematics — typically ±30° standard, ±45° for large-taper machines. BobCAD calculates the UV coordinates from the taper specification automatically.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-wire-edm-4axis
**Operations:** wire_edm

## Related
- [[edgecam-cam-tips-ec-049|Wire EDM 4-Axis Taper Cutting]]
- [[surfcam-cam-tips-sc2-056|4-Axis Wire EDM Taper Cutting with Independent UV]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-154|BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
