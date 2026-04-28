---
id: "wnc-052"
title: "Jerk Limitation Produces Glass-Smooth Surfaces"
source: "web:worknc-jerk"
confidence: 89
category: "cam_strategy"
tags: ["jerk", "smooth-surface", "vibration", "optical-quality"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.661Z
---

# Jerk Limitation Produces Glass-Smooth Surfaces

WorkNC's jerk limitation controls the rate of acceleration change, producing smooth velocity profiles that eliminate vibration-induced surface marks. Set the jerk limit based on the machine's specification (typically 5-50 m/s3 for mold-finishing machines). Lower jerk values produce smoother surfaces but increase cycle time. For optical-quality surfaces, use jerk values 50-70% of the machine maximum.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-jerk
**Operations:** finishing, hsm

## Related
- [[esprit-cam-tips-esp-108|Jerk Management for Ultra-Smooth Surface Finish]]
- [[catia-cam-tips-cat-147|Automatic Tool Axis Smoothing to Prevent Machine Jerking]]
- [[topsolid-cam-tips-ts-107|Machine Acceleration Limits Prevent Jerky Motion]]
- [[topsolid-cam-tips-ts-160|5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk]]
- [[worknc-cam-tips-wnc-051|Machine Acceleration Limits Prevent Velocity Droop]]
