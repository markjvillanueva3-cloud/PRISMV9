---
name: tribal-wnc-052
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["jerk", "smooth-surface", "vibration", "optical-quality"]
confidence: 89
source: "web:worknc-jerk"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-052.md
promoted_at: 2026-06-09T22:31:16.805Z
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
