---
id: "sc2-155"
title: "SURFCAM Swiss-Type Turning with Guide Bushing Compensation"
source: "web:surfcam-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["swiss-type", "guide-bushing", "turning", "z-reference", "deflection"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.170Z
---

# SURFCAM Swiss-Type Turning with Guide Bushing Compensation

SURFCAM's turning module supports Swiss-type lathes with guide bushing configurations. The Z-axis reference point must be set at the guide bushing face, not the spindle nose, because material feeds through the bushing. Program Z-axis moves as stock feed-out distances. Set the guide bushing clearance in the machine definition — typically 0.002-0.005mm diametral clearance. Parts longer than 4xD benefit most from Swiss-type because the guide bushing eliminates deflection regardless of part length.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[esprit-cam-tips-esp-045|Guide Bushing Management for Bar Feeding]]
- [[esprit-cam-tips-esp-130|Guide Bushing Compensation for Swiss-Type Z-Axis]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
