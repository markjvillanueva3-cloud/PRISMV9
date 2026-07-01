---
name: tribal-sc2-019
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["contour", "spring-pass", "wall-accuracy", "deflection"]
confidence: 90
source: "web:surfcam-contour-finishing"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-019.md
promoted_at: 2026-05-26T16:07:20.502Z
---

# Contour Milling with Spring Passes for Wall Accuracy

For precision contour milling, SURFCAM supports spring passes — repeated finish passes at the same depth with zero stock allowance. Tool deflection causes the first finish pass to leave 0.01-0.03mm of material; subsequent spring passes (typically 2-3) progressively remove this until the tool springs back to the programmed position. This achieves wall straightness within ±0.005mm without requiring a stiffer (larger) tool.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-contour-finishing
**Operations:** finishing, profiling

## Related
- [[edgecam-cam-tips-ec-037|Turning Finishing with Spring Pass for Accuracy]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-193|GibbsCAM micro-machining tool deflection compensation adjusts toolpath for bendable tools]]
- [[mastercam-cam-tips-mc-174|Feature size limits in micro machining are constrained by tool deflection, not geometry]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
