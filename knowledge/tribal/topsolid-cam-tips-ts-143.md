---
id: "ts-143"
title: "TopSolid Wire EDM 4-Axis Taper — Independent Upper and Lower Profiles"
source: "web:topsolid-docs"
confidence: 90
category: "cam_strategy"
tags: ["topsolid", "wire-edm", "4-axis", "taper", "profiles"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.495Z
---

# TopSolid Wire EDM 4-Axis Taper — Independent Upper and Lower Profiles

TopSolid'Cam Wire EDM supports 4-axis taper cutting with independent upper and lower profiles. Define different 2D profiles at the top and bottom of the workpiece, and the wire interpolates between them. Applications: stamping die clearance (profile + taper), extrusion dies (different entry/exit profiles), and complex 3D shapes from ruled surfaces. TopSolid automatically calculates the UV axis offsets from the profile geometry and workpiece thickness. Verify taper angles don't exceed machine limits (typically ±30° for 100mm height).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
- [[bobcad-cam-tips-bc-154|BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[cimatron-cam-tips-cim-149|Wire EDM Programming for Mold Inserts]]
