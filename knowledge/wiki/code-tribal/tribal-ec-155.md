---
name: tribal-ec-155
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["thread-whirling", "multi-start", "c-axis", "phase-offset"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-155.md
promoted_at: 2026-06-09T22:31:16.197Z
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
