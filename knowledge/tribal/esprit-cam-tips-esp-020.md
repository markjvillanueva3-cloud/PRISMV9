---
id: "esp-020"
title: "Radial Finishing for Circular and Dome Features"
source: "web:esprit-3d-machining"
confidence: 85
category: "cam_strategy"
tags: ["radial", "finishing", "dome", "circular"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.455Z
---

# Radial Finishing for Circular and Dome Features

Use ESPRIT's radial finishing strategy for circular features, domes, and boss tops. The toolpath radiates from a center point outward like spokes, which is more efficient than raster for round geometries. Set the angular increment (typically 1-5 degrees) based on the radius and target scallop height. Enable 'spiral connect' to link the radial passes with smooth arcs instead of retracts.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, radial

## Related
- [[topsolid-cam-tips-ts-025|Radial Finishing for Circular and Dome Shapes]]
- [[worknc-cam-tips-wnc-026|Radial Finishing for Dome and Circular Features]]
- [[fusion360-cam-tips-ext-f360-056|Radial Finishing for Circular and Dome Surfaces]]
- [[bobcad-cam-tips-bc-030|Radial Machining for Hub and Dome Features]]
- [[mastercam-cam-tips-mc-050|Area Rough stock-to-leave should match finishing tool radius for best results]]
