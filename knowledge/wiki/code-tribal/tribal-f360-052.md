---
name: tribal-f360-052
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "pencil", "fillet", "internal-corners", "cleanup"]
confidence: 88
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-052.md
promoted_at: 2026-06-09T22:31:16.264Z
---

# Pencil Finishing to Clean Internal Fillet Radii

Use Pencil finishing after Parallel or Scallop passes to clean up material left in internal corners and fillet transitions. Pencil traces the boundary where surfaces meet at sharp or radiused transitions, removing the cusp of material that wider-stepover passes cannot reach. Select a ball nose cutter with a radius equal to or smaller than the smallest fillet radius on the part. Run Pencil at 50-70% of the finishing feed rate to prevent chatter in tight corners.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:fusion360-docs
**Operations:** pencil

## Related
- [[cimatron-cam-tips-cim-071|Pencil Tracing for Corner Cleanup]]
- [[edgecam-cam-tips-ec-021|Pencil Machining Cleans Fillet Intersections]]
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
- [[tebis-cam-tips-teb-070|Pencil Tracing for Internal Corner Cleanup]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
