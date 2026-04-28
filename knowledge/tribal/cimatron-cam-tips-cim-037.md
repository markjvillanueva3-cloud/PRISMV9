---
id: "cim-037"
title: "IPW Transfer Between NC Setups"
source: "web:cimatron-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["ipw-transfer", "multi-setup", "stock-model", "efficiency"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.011Z
---

# IPW Transfer Between NC Setups

When splitting machining across multiple setups (fixture changes, part flip), use 'Transfer IPW' to carry the actual stock shape from Setup 1 into Setup 2. This prevents Setup 2 from assuming full stock and re-cutting already machined areas. The transferred IPW includes all geometry changes from previous setups — critical for parts machined on both sides.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[worknc-cam-tips-wnc-101|Air Cut Reduction Eliminates Empty Passes]]
- [[nx-cam-tips-nx-031|Mill-Turn Dual Spindle IPW Transfer]]
- [[catia-cam-tips-cat-099|Multi-Setup Part Positioning and Datum Transfer]]
- [[catia-cam-tips-cat-181|Multi-Setup Manufacturing Program Organization in CATIA]]
