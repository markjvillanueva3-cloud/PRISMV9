---
id: "sc2-032"
title: "Radial Finishing for Hub and Dome Geometries"
source: "web:surfcam-3axis-radial"
confidence: 87
category: "cam_strategy"
tags: ["radial", "hub", "dome", "angular-step", "ball-nose"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.057Z
---

# Radial Finishing for Hub and Dome Geometries

SURFCAM radial machining generates passes radiating from a center point outward, ideal for hub, dome, and round boss features. The toolpath density is highest at the center (where curvature is greatest) and spreads out toward the perimeter. Set the angular step to achieve target cusp height at the steepest point. For dome features, use a ball-nose tool with 0.1mm stepover at center, expanding to 0.5mm at the rim. Combine with a perimeter Z-level pass for wall cleanup.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:surfcam-3axis-radial
**Operations:** finishing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-030|Radial Machining for Hub and Dome Features]]
- [[esprit-cam-tips-esp-020|Radial Finishing for Circular and Dome Features]]
- [[fusion360-cam-tips-ext-f360-056|Radial Finishing for Circular and Dome Surfaces]]
- [[topsolid-cam-tips-ts-025|Radial Finishing for Circular and Dome Shapes]]
- [[worknc-cam-tips-wnc-026|Radial Finishing for Dome and Circular Features]]
