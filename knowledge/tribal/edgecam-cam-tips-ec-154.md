---
id: "ec-154"
title: "Thread Whirling Programming for Bone Screws"
source: "web:edgecam-docs"
confidence: 0.79
category: "cam_strategy"
tags: ["thread-whirling", "bone-screws", "medical", "synchronization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.387Z
---

# Thread Whirling Programming for Bone Screws

Thread whirling in Edgecam uses a ring-shaped cutter that surrounds the workpiece, with inserts on the inner diameter. Program the whirling head rotation (typically 3000-8000 RPM) synchronized with slow workpiece rotation and Z-axis feed for the thread lead. Set the whirling head offset (eccentricity) to control thread depth. For medical bone screws with variable pitch, program Z-feed as a function of C-axis position.

**Category:** cam_strategy
**Confidence:** 0.79
**Source:** web:edgecam-docs
**Operations:** turning, threading

## Related
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
- [[camworks-cam-tips-cw-169|Swiss-Type Thread Whirling — High-Speed Medical Screw Threading]]
- [[edgecam-cam-tips-ec-157|Thread Whirling Post Processor Requirements]]
- [[esprit-cam-tips-esp-134|Swiss-Type Thread Whirling for Medical Bone Screws]]
- [[gibbscam-cam-tips-gc-150|Swiss-type thread whirling in GibbsCAM produces medical screws at high speed]]
