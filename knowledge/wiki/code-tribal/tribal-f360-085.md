---
name: tribal-f360-085
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["fusion360", "controller-specific", "fanuc", "siemens", "haas", "smoothing"]
confidence: 87
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-085.md
promoted_at: 2026-06-09T22:31:16.272Z
---

# Control-Specific G-Code Features in Post Output

Customize your post to leverage controller-specific features: Fanuc 30i/31i supports AICC (AI Contour Control) via G05.1 for smoother 5-axis motion; Siemens 840D supports CYCLE832 for high-speed settings; Haas NGC supports G187 smoothing modes (P1/P2/P3). Enable these in the onSection() function by outputting the appropriate G-code header before cutting moves. Using native controller smoothing produces better surface finish than relying solely on Fusion's toolpath smoothing.

**Category:** post_processor
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** post_processing

## Related
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[mastercam-cam-tips-mc-204|Control definition files must match the specific CNC control for accurate G-code generation]]
- [[surfcam-cam-tips-sc2-073|Machine-Specific Post Processors for Major Brands]]
- [[fusion360-cam-tips-ext-f360-105|Smoothing Tolerance for Controller Look-Ahead]]
- [[fusion360-cam-tips-ext-f360-138|Tool Orientation Smoothing for 5-Axis Finishing]]
