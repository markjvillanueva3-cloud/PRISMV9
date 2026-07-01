---
name: tribal-cat-115
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "boring", "precision", "G76", "drilling"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-115.md
promoted_at: 2026-06-09T22:31:16.057Z
---

# Boring Cycle for Precision Hole Diameter and Position

Use CATIA's boring cycle (G85/G86/G76) for holes requiring H7 tolerance or better. G85 (feed-in, feed-out) produces the best surface finish; G76 (feed-in, orient-spindle, rapid-out) prevents drag marks on retract. In CATIA, specify the boring bar diameter, number of inserts, and the precise boring diameter. Set the feedrate to 0.05-0.1mm/rev for finishing bores. For interrupted bores (keyways, cross-holes), reduce feedrate by 50% at the interruption zone to prevent insert chipping.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-103|Boring — Single-Point Precision for Interpolated Holes]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
- [[sprutcam-cam-tips-spr-180|Boring Cycle with Spring Pass]]
- [[surfcam-cam-tips-sc2-095|Boring with Fine Boring and Back-Boring Cycles]]
- [[topsolid-cam-tips-ts-088|Boring Cycles for Precision Hole Finishing]]
