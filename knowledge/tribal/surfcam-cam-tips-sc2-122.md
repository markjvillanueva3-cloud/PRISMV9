---
id: "sc2-122"
title: "Corner Rest for Tight Radii Unreachable by Larger Tools"
source: "web:surfcam-corner-rest"
confidence: 88
category: "cam_strategy"
tags: ["corner-rest", "tight-radii", "tapered-ball-nose", "internal-corners"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.138Z
---

# Corner Rest for Tight Radii Unreachable by Larger Tools

SURFCAM corner rest specifically targets the material in internal corners where the previous tool's radius was too large to reach. The corner rest tool should have a radius equal to or smaller than the design corner radius. Set the detection sensitivity to find corners with remaining material thicker than 0.1mm. Use a tapered ball-nose tool for deep corners where a straight ball-nose would require excessive stick-out and cause chatter.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-corner-rest
**Operations:** rest_machining, finishing

## Related
- [[worknc-cam-tips-wnc-114|Corner Rest Machining Cleans Fillet Regions]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[gibbscam-cam-tips-gc-190|GibbsCAM rest-finishing with smaller ball nose reaches tight radii in hardened cavities]]
- [[surfcam-cam-tips-sc2-034|Cleanup Passes with Small Tools for Residual Material]]
- [[catia-cam-tips-cat-030|Blade Root Fillet Machining With Tapered Ball Nose]]
