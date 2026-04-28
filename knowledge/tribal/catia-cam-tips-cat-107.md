---
id: "cat-107"
title: "Automatic Rest Detection Threshold Settings"
source: "web:catia-docs"
confidence: 87
category: "cam_strategy"
tags: ["catia", "auto-rest", "threshold", "detection", "rest"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.884Z
---

# Automatic Rest Detection Threshold Settings

In CATIA automatic rest detection, set the residual stock threshold to a value slightly larger than the previous tool's finishing allowance. If the previous tool left 0.3mm stock, set the rest detection threshold to 0.35mm so CATIA only targets areas with actual residual material, ignoring areas within the normal stock allowance. Setting the threshold too low generates excessive air-cutting passes; too high misses genuine residual stock. Verify rest detection results visually using the stock display overlay before computing the tool path.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** rest_machining

## Related
- [[catia-cam-tips-cat-105|Re-Machining Detects Residual Stock from Previous Operations]]
- [[catia-cam-tips-cat-009|Closed Pocket Island Detection and Machining Strategy]]
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-108|Multi-Tool Rest Machining for Progressive Corner Cleanup]]
