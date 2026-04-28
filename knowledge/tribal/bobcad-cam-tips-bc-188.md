---
id: "bc-188"
title: "BobCAD Composite Drilling with Delamination Prevention"
source: "web:bobcad-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["composite", "drilling", "delamination", "brad-point", "sandwich"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.604Z
---

# BobCAD Composite Drilling with Delamination Prevention

BobCAD programs composite drilling with reduced feed at ply entry and exit to prevent delamination. Use a custom drill cycle: 100% feed through the middle laminate, 50% feed for the first and last 1mm. Brad-point or dagger drills outperform twist drills in composites by scoring fibers before cutting. Set spindle speed to 4000-8000 RPM for CFRP. For sandwich structures (CFRP/foam/CFRP), use peck drilling through each skin and continuous drilling through the foam core. Back support plates reduce exit delamination by 80%. Program pilot holes 0.5mm undersize for reamed holes requiring tight tolerances.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** drilling

## Related
- [[surfcam-cam-tips-sc2-172|SURFCAM Composite Drilling Strategies to Prevent Delamination]]
- [[worknc-cam-tips-wnc-163|Composite Drilling — Preventing Entry and Exit Delamination]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
