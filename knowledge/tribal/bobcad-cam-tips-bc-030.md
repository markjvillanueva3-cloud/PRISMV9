---
id: "bc-030"
title: "Radial Machining for Hub and Dome Features"
source: "web:bobcad-radial"
confidence: 87
category: "cam_strategy"
tags: ["radial", "hub", "dome", "angular-step"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.467Z
---

# Radial Machining for Hub and Dome Features

BobCAD radial machining generates passes radiating from a center point, ideal for hub, dome, and round boss features. Toolpath density is highest at the center and spreads outward. Set angular step to achieve target cusp height at the steepest point. For dome features, use a ball-nose with 0.1mm stepover at center expanding to 0.5mm at rim. Combine with a perimeter Z-level pass for wall cleanup at the dome-to-wall transition.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-radial
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-032|Radial Finishing for Hub and Dome Geometries]]
- [[esprit-cam-tips-esp-020|Radial Finishing for Circular and Dome Features]]
- [[fusion360-cam-tips-ext-f360-056|Radial Finishing for Circular and Dome Surfaces]]
- [[topsolid-cam-tips-ts-025|Radial Finishing for Circular and Dome Shapes]]
- [[worknc-cam-tips-wnc-026|Radial Finishing for Dome and Circular Features]]
