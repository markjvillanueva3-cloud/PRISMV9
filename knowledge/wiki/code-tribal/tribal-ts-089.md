---
name: tribal-ts-089
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["reaming", "precision", "surface-finish", "tolerance"]
confidence: 90
source: "web:topsolid-reaming"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-089.md
promoted_at: 2026-05-26T16:07:21.036Z
---

# Reaming with Controlled Feed and Speed

TopSolid's reaming operation uses G85 with precise feed and speed control. Set the cutting speed to 50-70% of the drilling speed for the same material and the feed rate to 2-3x the drilling feed for best surface finish. The reaming allowance (stock left by the drill) should be 0.1-0.2 mm per side for hand reamers and 0.15-0.3 mm for machine reamers. Enable coolant flooding and set the retract feed to match the cutting feed to prevent marking.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-reaming
**Operations:** drilling

## Related
- [[worknc-cam-tips-wnc-085|Reaming with Controlled Feed and Speed]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
- [[bobcad-cam-tips-bc-112|Reaming for Precision Hole Finishing]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[esprit-cam-tips-esp-082|Reaming Cycle with Controlled Feed and Dwell]]
