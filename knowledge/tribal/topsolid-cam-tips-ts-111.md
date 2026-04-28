---
id: "ts-111"
title: "In-Process Inspection Verifies Critical Dimensions"
source: "web:topsolid-inspection"
confidence: 91
category: "cam_strategy"
tags: ["in-process", "inspection", "tolerance", "verification"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.471Z
---

# In-Process Inspection Verifies Critical Dimensions

TopSolid programs in-process probing cycles that run between machining operations to verify critical dimensions before proceeding. If a dimension is out of tolerance, the program can: (1) apply a tool offset correction and re-cut, (2) alert the operator, or (3) abort the program to prevent scrap. Define inspection points on critical bore diameters, face positions, and pocket depths. Set the tolerance band to the drawing tolerance minus a safety margin (typically 25% of the tolerance band).

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-inspection
**Operations:** probing

## Related
- [[worknc-cam-tips-wnc-119|In-Process Inspection Catches Errors Mid-Program]]
- [[edgecam-cam-tips-ec-111|In-Process Inspection Between Operations]]
- [[bobcad-cam-tips-bc-121|In-Process Inspection for Critical Dimensions]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[esprit-cam-tips-esp-117|In-Process Inspection Between Operations]]
