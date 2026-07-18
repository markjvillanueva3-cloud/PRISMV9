---
name: tribal-bc-047
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "css", "constant-surface-speed", "max-rpm", "g96"]
confidence: 89
source: "web:bobcad-facing"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-047.md
promoted_at: 2026-06-09T22:31:15.943Z
---

# Face Turning with CSS and Max RPM Control

BobCAD facing maintains constant surface speed (CSS/G96) with automatic RPM increase as diameter decreases. Set maximum spindle speed (G50 S_) to prevent over-speed at small diameters: 3000 RPM for light chucks, 4000+ for collets. For finish facing, use 0.1-0.2mm depth and 0.08-0.12 mm/rev feed. Program the tool past center by 0.5-1mm to eliminate the center nub. BobCAD handles the CSS transition from OD to center automatically.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-facing
**Operations:** turning_facing

## Related
- [[surfcam-cam-tips-sc2-049|Face Turning with Material-Specific Speed Control]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[edgecam-cam-tips-ec-041|Turning Face Cycle with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
