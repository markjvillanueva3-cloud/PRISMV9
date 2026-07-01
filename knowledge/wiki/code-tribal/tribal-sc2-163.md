---
name: tribal-sc2-163
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "taper-cutting", "uv-axis", "die-cutting"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-163.md
promoted_at: 2026-06-09T22:31:16.695Z
---

# SURFCAM Wire EDM 4-Axis Taper Cutting with Independent UV

SURFCAM's wire EDM module supports 4-axis taper cutting where the upper (UV) and lower (XY) wire guides follow different contours. Define the top and bottom profiles independently — SURFCAM interpolates the wire path between them. For dies with draft angles, set the taper angle per segment rather than a global taper. Maximum achievable taper depends on the machine's UV travel range and workpiece thickness — typically 30° at 50mm thickness, reducing to 10° at 200mm. Verify wire angle limits in the machine definition.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]]
