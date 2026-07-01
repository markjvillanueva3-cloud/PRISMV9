---
name: tribal-cw-067
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "turning", "facing", "css", "constant-surface-speed"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-067.md
promoted_at: 2026-06-09T22:31:16.001Z
---

# Facing — Optimize Feed Direction and Constant Surface Speed

For facing operations, machine from outside-in (OD to center) for better chip evacuation and surface finish. Enable CSS (Constant Surface Speed) to maintain uniform cutting speed as the diameter decreases — without CSS, surface speed drops to near-zero at the center, causing built-up edge and poor finish. Set an RPM limit to prevent overspeeding at small diameters. For large faces (> 200mm diameter), use a wiper insert geometry to achieve excellent Ra without reducing feed rate.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** turning, facing

## Related
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[edgecam-cam-tips-ec-041|Turning Face Cycle with Constant Surface Speed]]
- [[surfcam-cam-tips-sc2-049|Face Turning with Material-Specific Speed Control]]
