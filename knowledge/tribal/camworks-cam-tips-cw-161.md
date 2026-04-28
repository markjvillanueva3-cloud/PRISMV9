---
id: "cw-161"
title: "Wire EDM Taper Cutting — Die Clearance and Draft Angles"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "wire-edm", "taper", "die-clearance", "uv-axis"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.770Z
---

# Wire EDM Taper Cutting — Die Clearance and Draft Angles

CAMWorks Wire EDM supports taper cutting for die clearance angles. The UV axes tilt the wire to create a different profile at the top and bottom of the workpiece. For stamping dies, program 0.5-2° clearance taper on the die opening side. CAMWorks calculates the UV offsets from the part geometry — specify the taper angle and the reference surface (top or bottom). Maximum taper angle depends on workpiece thickness and machine travel: typically ±30°/100mm for modern machines. Verify taper with test cuts in scrap material.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-kb-017|Taper cutting: verify UV zero offset before every job]]
