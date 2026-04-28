---
id: "bc-076"
title: "Sheet Optimization with Multiple Part Quantities"
source: "web:bobcad-sheet-optimization"
confidence: 88
category: "cam_strategy"
tags: ["sheet-optimization", "mixed-quantities", "priority", "cost-estimation"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.516Z
---

# Sheet Optimization with Multiple Part Quantities

BobCAD nesting handles mixed part quantities on a single sheet. Input the required quantity per part number and the sheet size. The optimizer determines the minimum number of sheets needed and the optimal arrangement on each sheet. Prioritize by part priority (urgent parts first) or by material utilization (maximum fill first). Output a nesting report showing part quantities per sheet, material utilization percentage, and scrap weight for cost estimation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-sheet-optimization
**Operations:** nesting

## Related
- [[worknc-cam-tips-wnc-007|Tilt Control Parameters Fine-Tune 5-Axis Behavior]]
- [[fusion360-cam-tips-ext-f360-164|Tool Life Tracking in Cloud Libraries]]
- [[topsolid-cam-tips-ts-179|TopSolid Additive Cost Estimation — Material, Time, and Post-Processing]]
