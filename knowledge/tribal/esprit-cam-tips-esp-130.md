---
id: "esp-130"
title: "Guide Bushing Compensation for Swiss-Type Z-Axis"
source: "web:esprit-docs"
confidence: 0.89
category: "setup"
tags: ["swiss-type", "guide-bushing", "z-reference", "bar-feed"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.562Z
---

# Guide Bushing Compensation for Swiss-Type Z-Axis

Swiss-type lathes feed the bar through a guide bushing, so the Z-axis reference is at the bushing face, not the spindle. In ESPRIT, set the Z-origin to the guide bushing face in Machine Setup → Z Reference → Guide Bushing. The post processor then outputs Z-moves relative to the bushing. For guide-bushing-less mode (available on modern Star SR and Citizen L-series), switch to Spindle Face reference — the post adjusts Z-direction sign and compensation automatically.

**Category:** setup
**Confidence:** 0.89
**Source:** web:esprit-docs
**Operations:** turning_roughing, turning_finishing

## Related
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[surfcam-cam-tips-sc2-155|SURFCAM Swiss-Type Turning with Guide Bushing Compensation]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[esprit-cam-tips-esp-045|Guide Bushing Management for Bar Feeding]]
