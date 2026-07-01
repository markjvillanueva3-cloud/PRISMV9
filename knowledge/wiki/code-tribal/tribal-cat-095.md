---
name: tribal-cat-095
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "smooth-flow", "transitions", "dwell-marks", "hsm"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-095.md
promoted_at: 2026-06-09T22:31:16.052Z
---

# Smooth Flow Tool Path Transitions Eliminate Dwell Marks

In HSM finishing operations in CATIA, enable smooth tool path transitions (tangent arcs) between adjacent passes to eliminate the dwell marks caused by tool deceleration at pass ends. Set the transition type to 'Arc' with a radius of 2-5mm and enable 'Smooth Connections' between passes. For Sweeping operations, use the 'One Way with Smooth Retract' mode rather than Zigzag — the smooth retract arc at the end of each pass lifts the tool gradually, preventing the dig-in mark that occurs with abrupt retracts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-090|Trochoidal Milling in CATIA for Slot and Channel Roughing]]
- [[catia-cam-tips-cat-091|Constant Engagement Angle Control for Stable Cutting]]
- [[catia-cam-tips-cat-092|Corner Rounding Enables High Feed Rates Through Direction Changes]]
- [[catia-cam-tips-cat-093|Arc Fitting Reduces NC Program Size and Improves Motion Quality]]
- [[catia-cam-tips-cat-094|Feed Optimization Based on Instantaneous Chip Load]]
