---
name: tribal-ec-021
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil", "fillet", "cleanup", "ball-nose"]
confidence: 88
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-021.md
promoted_at: 2026-06-09T22:31:16.165Z
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
