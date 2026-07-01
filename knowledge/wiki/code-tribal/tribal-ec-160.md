---
name: tribal-ec-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["peck-drilling", "deep-hole", "peck-reduction", "chip-breaking"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-160.md
promoted_at: 2026-06-09T22:31:16.199Z
---

# Peck Drilling Depth Progression for Deep Holes

For standard peck drilling of deep holes (L/D 5-10:1), use decreasing peck depths: first peck at 3x diameter, subsequent pecks reducing by 20-30% each. In Edgecam, set 'first peck' and 'peck reduction' parameters. Example for 10mm drill: pecks at 30mm, 21mm, 15mm, 10mm, 7mm. The reducing pecks account for increasing chip evacuation difficulty. Set dwell at bottom of each peck (0.5-1 second) to break the chip before retract.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:edgecam-docs
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
- [[topsolid-cam-tips-ts-086|Peck Drilling with Optimized Retract Heights]]
- [[worknc-cam-tips-wnc-082|Peck Drilling with Optimized Retract Strategy]]
- [[bobcad-cam-tips-bc-109|Peck Drilling with Configurable Retract Strategy]]
