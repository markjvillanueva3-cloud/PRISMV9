---
id: "teb-035"
title: "Pencil Trace Finishing Cleans Fillet and Corner Regions"
source: "web:tebis-docs"
confidence: 92
category: "finishing"
tags: ["pencil", "fillet", "corner", "trace"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.247Z
---

# Pencil Trace Finishing Cleans Fillet and Corner Regions

Tebis pencil trace finishing automatically detects concave fillet regions and generates passes along the fillet centerline. Multiple offset passes clean the full fillet width. Set the number of offsets based on fillet radius: 1-2 offsets for R < 3mm, 3-5 for R = 3-10mm. Use a ball endmill with radius equal to or smaller than the fillet radius. Pencil finishing removes cusp material left by prior finishing passes and produces the blended fillet appearance required for polished mold surfaces.

**Category:** finishing
**Confidence:** 92
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-140|Pencil toolpath with wall cleanup targets fillet corners that larger tools cannot reach]]
- [[catia-cam-tips-cat-018|Pencil Tracing Targets Fillet and Corner Residual Stock]]
- [[cimatron-cam-tips-cim-071|Pencil Tracing for Corner Cleanup]]
- [[edgecam-cam-tips-ec-021|Pencil Machining Cleans Fillet Intersections]]
- [[fusion360-cam-tips-ext-f360-052|Pencil Finishing to Clean Internal Fillet Radii]]
