---
id: "ec-021"
title: "Pencil Machining Cleans Fillet Intersections"
source: "web:edgecam-milling"
confidence: 88
category: "cam_strategy"
tags: ["pencil", "fillet", "cleanup", "ball-nose"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.268Z
---

# Pencil Machining Cleans Fillet Intersections

Edgecam's pencil machining traces the bottom of concave fillet intersections where larger tools leave unmachined stock. The toolpath follows the fillet centerline automatically. Use a ball-nose cutter with radius equal to or slightly smaller than the fillet radius. Set the stepover to 0.05-0.15mm for finishing quality. Enable multi-pass pencil for fillets deeper than the ball radius to progressively remove material.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-milling
**Operations:** 3d_finishing, pencil

## Related
- [[cimatron-cam-tips-cim-071|Pencil Tracing for Corner Cleanup]]
- [[fusion360-cam-tips-ext-f360-052|Pencil Finishing to Clean Internal Fillet Radii]]
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
- [[tebis-cam-tips-teb-070|Pencil Tracing for Internal Corner Cleanup]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
