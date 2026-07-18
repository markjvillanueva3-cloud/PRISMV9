---
name: tribal-wnc-029
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["steep-shallow", "automatic", "hybrid", "transition"]
confidence: 93
source: "web:worknc-steepshallow"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-029.md
promoted_at: 2026-05-26T16:07:21.401Z
---

# Steep/Shallow Automatic Strategy Combination

WorkNC's automatic steep/shallow finishing combines Z-level passes for steep regions with planar raster passes for shallow regions. The threshold angle (typically 30-45 degrees) determines the boundary. Set the overlap band to 5-10 degrees to prevent ridges at the transition. This single operation replaces what would otherwise require two separate finishing operations with manual boundary selection.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:worknc-steepshallow
**Operations:** finishing, 3d_finishing

## Related
- [[topsolid-cam-tips-ts-028|Steep/Shallow Finishing Combines Best Strategies Per Region]]
- [[tebis-cam-tips-teb-034|Steep/Shallow Split Combines Z-Constant and Equidistant Strategies]]
- [[bobcad-cam-tips-bc-028|Steep/Shallow Hybrid Finishing for Optimal Surface Quality]]
- [[cimatron-cam-tips-cim-022|Steep/Shallow Boundary Detection for Hybrid Finishing]]
- [[cimatron-cam-tips-cim-070|Steep and Shallow Automatic Strategy Assignment]]
