---
id: "gc-019"
title: "Cleanup passes with tapered ball nose reach deep narrow fillets"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "cleanup", "3d", "tapered-ball-nose", "fillet", "deep-cavity"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.846Z
---

# Cleanup passes with tapered ball nose reach deep narrow fillets

For deep narrow fillets in 3D mold cavities, use a tapered ball nose end mill in GibbsCAM's cleanup strategy. Define the taper angle in the tool definition (typically 1-3°) and the system adjusts the toolpath to account for the non-cylindrical shank. This allows reaching fillets at depth-to-diameter ratios of 8:1 or greater without colliding with adjacent walls. Set the collision check to include the tool holder and verify clearance with the Cut Part rendering before running.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-018|Rest machining with IPW tracks remaining stock for targeted cleanup]]
- [[gibbscam-cam-tips-gc-010|Island avoidance with rest machining cleans up material around bosses]]
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
