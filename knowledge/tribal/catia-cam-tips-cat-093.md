---
id: "cat-093"
title: "Arc Fitting Reduces NC Program Size and Improves Motion Quality"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "arc-fitting", "g-code", "smooth-motion", "hsm"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.874Z
---

# Arc Fitting Reduces NC Program Size and Improves Motion Quality

Enable CATIA's arc fitting post-processor option to convert sequences of short linear segments (G1) into circular arcs (G2/G3). This reduces NC program size by 50-80% for curved tool paths, which is critical for controllers with limited memory. More importantly, arc interpolation produces smoother machine motion than many short linear segments, reducing vibration and improving surface finish. Set the arc fitting tolerance to half the machining tolerance (e.g., 0.005mm for a 0.01mm tolerance) to ensure the fitted arcs stay within specification.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-092|Corner Rounding Enables High Feed Rates Through Direction Changes]]
- [[esprit-cam-tips-esp-102|Arc Fitting in Post Processor for Smooth G-Code]]
- [[worknc-cam-tips-wnc-046|Arc Fitting Reduces File Size and Improves Motion]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
