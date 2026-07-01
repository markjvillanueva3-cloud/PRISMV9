---
name: tribal-bc-150
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "eccentric-turning", "c-axis", "interpolation", "off-center"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-150.md
promoted_at: 2026-06-09T22:31:15.969Z
---

# BobCAD Mill-Turn Eccentric Turning with C-Axis Interpolation

BobCAD supports eccentric turning (off-center cylindrical features) using simultaneous C-axis rotation and X-axis interpolation. The part rotates on the C-axis while the tool follows a circular XC path to create an eccentric diameter. Define the eccentricity (offset from spindle centerline) and the eccentric diameter. BobCAD calculates the required CX synchronization. Maximum eccentricity depends on machine rigidity and spindle RPM — typically limited to 5-10mm at 500-1000 RPM. Use balanced chucks for eccentric turning to prevent vibration from the off-center mass.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-054|Y-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[edgecam-cam-tips-ec-046|Y-Axis Operations for Off-Center Milling]]
