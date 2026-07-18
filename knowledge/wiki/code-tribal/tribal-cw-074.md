---
name: tribal-cw-074
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "4-axis", "taper", "die-clearance"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-074.md
promoted_at: 2026-06-09T22:31:16.003Z
---

# 4-Axis Wire EDM Taper — Independent Upper and Lower Profiles

CAMWorks 4-axis wire EDM supports taper cutting with independent upper and lower guide paths. For die clearance taper, set the taper angle (typically 0.5-2° per side) and the system generates the upper guide path offset from the lower profile. For complex shapes with variable taper, define separate upper and lower profiles — the wire interpolates between them. Verify the taper direction: positive taper (wider at top) for die relief, negative taper for punch draft.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-161|Wire EDM Taper Cutting — Die Clearance and Draft Angles]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
- [[bobcad-cam-tips-bc-154|BobCAD Wire EDM 4-Axis Taper with Independent Top/Bottom Profiles]]
- [[cimatron-cam-tips-cim-149|Wire EDM Programming for Mold Inserts]]
