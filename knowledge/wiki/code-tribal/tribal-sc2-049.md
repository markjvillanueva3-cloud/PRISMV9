---
name: tribal-sc2-049
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "css", "constant-surface-speed", "max-rpm"]
confidence: 89
source: "web:surfcam-lathe-facing"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-049.md
promoted_at: 2026-06-09T22:31:16.671Z
---

# Face Turning with Material-Specific Speed Control

SURFCAM facing maintains constant surface speed (CSS/G96) as the tool moves from OD to center, automatically increasing RPM as diameter decreases. Set the maximum spindle speed limit (G50 S_) to prevent over-speed at small diameters — typically 3000 RPM for light chucks, 4000+ for collets. For face finishing, use a 0.1-0.2mm depth of cut and 0.08-0.12 mm/rev feed rate. Program the tool to cut past center by 0.5-1mm to eliminate the center nub.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-lathe-facing
**Operations:** turning_facing

## Related
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[edgecam-cam-tips-ec-041|Turning Face Cycle with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
