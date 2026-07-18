---
name: tribal-spr-006
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "taper", "no-core"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-006.md
promoted_at: 2026-06-09T22:31:16.620Z
---

# Wire EDM 4-Axis Taper Cutting

For tapered wire EDM cuts, SprutCAM supports independent UV axis control. Define the taper angle per segment or specify different top/bottom profiles for complex die shapes. Set 'Wire Offset' for both rough and skim passes — rough: spark gap + 0.02mm, skim: spark gap only. Use 'No-Core' cutting for internal features where slug removal isn't possible (tabs hold the slug).

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:sprutcam-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
- [[bobcad-cam-tips-bc-154|BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[cimatron-cam-tips-cim-149|Wire EDM Programming for Mold Inserts]]
