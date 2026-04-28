---
id: "ec-155"
title: "Thread Whirling Multi-Start Configuration"
source: "web:edgecam-docs"
confidence: 0.78
category: "cam_strategy"
tags: ["thread-whirling", "multi-start", "c-axis", "phase-offset"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.387Z
---

# Thread Whirling Multi-Start Configuration

For multi-start thread whirling, program multiple passes with C-axis offset equal to 360°/number-of-starts. A triple-start thread requires three passes with 0°, 120°, and 240° C-axis offsets. Use the thread whirling cycle with the 'number of starts' parameter — Edgecam calculates the required phase offsets automatically. Verify start spacing in simulation by checking the thread form at multiple Z-positions.

**Category:** cam_strategy
**Confidence:** 0.78
**Source:** web:edgecam-docs
**Operations:** turning, threading

## Related
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
- [[camworks-cam-tips-cw-169|Swiss-Type Thread Whirling — High-Speed Medical Screw Threading]]
- [[edgecam-cam-tips-ec-154|Thread Whirling Programming for Bone Screws]]
- [[edgecam-cam-tips-ec-156|Thread Whirling Insert Selection and Speed Calculation]]
- [[edgecam-cam-tips-ec-157|Thread Whirling Post Processor Requirements]]
