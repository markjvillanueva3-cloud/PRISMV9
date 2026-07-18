---
name: tribal-sc-059
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "hsm", "constant-z", "spiral-linking", "witness-lines"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-059.md
promoted_at: 2026-05-26T16:07:20.420Z
---

# HSM Constant Z with Spiral Transition — Eliminate Z-Step Witness Lines

In HSM Constant Z finishing, enable the Spiral Linking option to create smooth transitions between Z-levels instead of abrupt step-downs. The spiral transition distributes the Z-step across the full contour length, eliminating the visible witness line that occurs at each depth change. This is critical for mold surfaces with draft angles of 1-5 degrees, where even 0.01mm Z-step marks are visible after polishing. Set maximum spiral angle to 2-3 degrees.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** finishing, mold_die

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-060|HSM Linear Finishing — Optimal Angle for Surface Quality]]
- [[solidcam-cam-tips-sc-061|HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave]]
