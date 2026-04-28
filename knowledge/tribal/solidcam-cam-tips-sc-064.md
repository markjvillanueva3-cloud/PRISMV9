---
id: "sc-064"
title: "HSM Horizontal Area Detection — Automatic Flat Region Strategy"
source: "web:solidcam-docs"
confidence: 89
category: "cam_strategy"
tags: ["solidcam", "hsm", "horizontal-area", "flat-detection", "ball-nose"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.713Z
---

# HSM Horizontal Area Detection — Automatic Flat Region Strategy

Enable Horizontal Area Detection in HSM to automatically identify near-flat regions (slope < 5-10 degrees) and apply a separate machining strategy. Flat areas machined with a ball nose at constant Z leave poor finish because the effective cutting diameter approaches zero at the tool tip. The horizontal area strategy switches to a planar raster or spiral pass, using the ball nose side cutting edge effectively. Set the detection threshold to match your surface tolerance — typically 5 degrees for fine finishing.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** finishing, surface_machining

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-179-2|Flat Area Detection for Strategy]]
- [[solidcam-cam-tips-sc-059|HSM Constant Z with Spiral Transition — Eliminate Z-Step Witness Lines]]
