---
id: "bc-167"
title: "BobCAD Swiss-Type Lathe Programming with Guide Bushing"
source: "web:bobcad-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["swiss-type", "guide-bushing", "z-reference", "deflection", "bar-feed"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.587Z
---

# BobCAD Swiss-Type Lathe Programming with Guide Bushing

BobCAD's turning module supports Swiss-type lathes by defining the Z-axis reference at the guide bushing face. Material feeds through the guide bushing as the Z-axis moves, unlike conventional lathes where the tool moves in Z. Configure the guide bushing clearance (0.002-0.005mm diametral) in the machine definition. Program Z moves as stock feed-out distances. Parts with L/D >4 benefit most from Swiss-type because the guide bushing eliminates deflection. BobCAD's simulation shows the bar stock feeding through the bushing to verify clearance and operation sequence.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[esprit-cam-tips-esp-130|Guide Bushing Compensation for Swiss-Type Z-Axis]]
- [[surfcam-cam-tips-sc2-155|SURFCAM Swiss-Type Turning with Guide Bushing Compensation]]
- [[esprit-cam-tips-esp-045|Guide Bushing Management for Bar Feeding]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
