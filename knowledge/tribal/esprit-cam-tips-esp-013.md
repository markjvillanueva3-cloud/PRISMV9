---
id: "esp-013"
title: "Pencil Tracing Cleans Fillet Intersections"
source: "web:esprit-3d-machining"
confidence: 88
category: "cam_strategy"
tags: ["pencil-tracing", "fillets", "cleanup", "ball-nose"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.449Z
---

# Pencil Tracing Cleans Fillet Intersections

Use ESPRIT's pencil tracing cycle to clean material from internal fillet intersections that larger tools cannot reach. Pencil tracing automatically detects concave fillet regions and generates toolpaths that follow the fillet centerline. Use a ball-nose cutter with radius matching or slightly smaller than the fillet radius. Set stepover to 0.05-0.15mm for finishing and enable 'multi-pass' for fillets deeper than the tool radius.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, pencil

## Related
- [[worknc-cam-tips-wnc-154|WorkNC Pencil Tracing — Corner Cleanup on Fillets and Transitions]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[solidcam-cam-tips-sc-066|HSM Pencil Tracing — Clean Internal Fillets in One Pass]]
- [[surfcam-cam-tips-sc2-180|SURFCAM Pencil Tracing for Hardened Steel Fillet Cleanup]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
