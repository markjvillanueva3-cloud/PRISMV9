---
name: tribal-esp-154
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "taper", "uv-axis", "independent-profile"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-154.md
promoted_at: 2026-06-09T22:31:16.248Z
---

# Wire EDM 4-Axis Taper Cutting with Independent UV Motion

ESPRIT's 4-axis wire EDM programs taper cuts by moving the upper guide (UV axes) independently from the lower guide (XY axes). Define a top profile and bottom profile — ESPRIT automatically generates the UV offsets for constant taper angle or variable taper (different angles on different segments). For constant taper, set the angle and part height; for variable taper, assign taper angles per segment. Maximum reliable taper is typically ±30° (machine-dependent). Verify in simulation that the wire doesn't contact the workpiece at entry/exit transitions between different taper segments.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:esprit-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
