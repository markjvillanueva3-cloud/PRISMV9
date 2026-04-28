---
id: "ts-107"
title: "Machine Acceleration Limits Prevent Jerky Motion"
source: "web:topsolid-accel"
confidence: 90
category: "cam_strategy"
tags: ["acceleration", "jerk", "hsm", "machine-limits"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.468Z
---

# Machine Acceleration Limits Prevent Jerky Motion

TopSolid allows defining machine acceleration and jerk limits that the toolpath generator respects during path planning. Set these values from the machine's actual specification sheet. The toolpath generator then ensures that no segment requires acceleration or deceleration beyond the machine's capability, preventing velocity droop in corners and during direction changes. This is critical for HSM operations where maintaining programmed feed rate through corners directly affects surface quality.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-accel
**Operations:** finishing, hsm

## Related
- [[worknc-cam-tips-wnc-051|Machine Acceleration Limits Prevent Velocity Droop]]
- [[bobcad-cam-tips-bc-107|Acceleration-Aware Toolpath Smoothing for HSM]]
- [[edgecam-cam-tips-ec-095|Acceleration Control for High-Speed Machining]]
- [[esprit-cam-tips-esp-107|Acceleration Control for High-Speed Machining]]
- [[gibbscam-cam-tips-gc-103|Acceleration-aware toolpath generation matches machine dynamics for actual speed]]
