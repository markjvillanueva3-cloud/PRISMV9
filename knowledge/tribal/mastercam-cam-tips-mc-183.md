---
id: "mc-183"
title: "Stock model display mode enables visual verification of rest material before cutting"
source: "web:community"
confidence: 84
category: "cam_strategy"
tags: ["mastercam", "stock-model", "display", "visual-verification", "color-map", "rest-material"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.266Z
---

# Stock model display mode enables visual verification of rest material before cutting

Mastercam provides several stock model display options for visual verification: Shaded mode shows the stock as a solid body with color-coded remaining thickness; Translucent mode overlays the stock on the part model so you can see where material remains; Wireframe mode shows the stock model edges for detailed geometry inspection. Use the Stock Model Display (on the View tab or right-click the operation in Toolpath Manager) to inspect rest material before generating the next toolpath. Color mapping by remaining thickness helps identify areas with excessive rest material (indicating the previous tool was too large or missed a region) versus areas already at final dimension (where no additional cutting is needed). This visual check prevents programming errors where a finishing pass runs over an area still carrying 2–5 mm of stock, which would overload the finishing tool. Always verify stock model display before generating rest finishing operations.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** setup, verification

## Related
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
- [[mastercam-cam-tips-mc-099|Tool String display shows complete tool stack for quick visual verification]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[mastercam-cam-tips-mc-180|Rest finishing targets only areas where the semi-finish tool left excess material]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
