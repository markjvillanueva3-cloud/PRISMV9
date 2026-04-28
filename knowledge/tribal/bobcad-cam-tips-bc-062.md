---
id: "bc-062"
title: "4-Axis Wire EDM Taper with Independent UV Guides"
source: "web:bobcad-wire-edm-4axis"
confidence: 88
category: "cam_strategy"
tags: ["wire-edm", "4-axis", "taper", "uv-guides", "variable-taper"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.505Z
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
