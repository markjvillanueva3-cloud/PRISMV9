---
id: "ts-028"
title: "Steep/Shallow Finishing Combines Best Strategies Per Region"
source: "web:topsolid-steepshallow"
confidence: 93
category: "cam_strategy"
tags: ["steep-shallow", "hybrid", "automatic", "transition"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.408Z
---

# Steep/Shallow Finishing Combines Best Strategies Per Region

TopSolid's automatic steep/shallow finishing uses Z-level passes for steep regions and planar (raster) passes for shallow regions, with a user-defined threshold angle (typically 30-45°). The system automatically blends the two strategies at the transition zone. Set the overlap band to 5-10° to prevent ridges at the boundary. This single operation replaces what would otherwise require two separate finishing operations with manual boundary definition.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-steepshallow
**Operations:** finishing, 3d_finishing

## Related
- [[worknc-cam-tips-wnc-029|Steep/Shallow Automatic Strategy Combination]]
- [[tebis-cam-tips-teb-034|Steep/Shallow Split Combines Z-Constant and Equidistant Strategies]]
- [[bobcad-cam-tips-bc-028|Steep/Shallow Hybrid Finishing for Optimal Surface Quality]]
- [[cimatron-cam-tips-cim-022|Steep/Shallow Boundary Detection for Hybrid Finishing]]
- [[cimatron-cam-tips-cim-070|Steep and Shallow Automatic Strategy Assignment]]
