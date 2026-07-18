---
name: tribal-ec-041
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "css", "constant-surface-speed", "rpm-limit"]
confidence: 88
source: "web:edgecam-turning"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-041.md
promoted_at: 2026-06-09T22:31:16.169Z
---

# Turning Face Cycle with Constant Surface Speed

For facing operations in Edgecam, always use constant surface speed (CSS/G96) mode. As the tool approaches the center, the spindle RPM increases to maintain cutting speed. Set a maximum RPM limit (G50 S-value) to prevent the spindle from exceeding its safe speed — typically 80% of the machine's maximum RPM. For large diameter parts, start from the OD inward for climb cutting, which produces better surface finish than starting from center.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-turning
**Operations:** turning_facing

## Related
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[surfcam-cam-tips-sc2-049|Face Turning with Material-Specific Speed Control]]
- [[catia-cam-tips-cat-157|CATIA Lathe Constant Surface Speed Programming Limits]]
