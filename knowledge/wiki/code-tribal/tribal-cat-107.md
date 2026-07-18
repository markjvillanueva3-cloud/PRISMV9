---
name: tribal-cat-107
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "auto-rest", "threshold", "detection", "rest"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-107.md
promoted_at: 2026-06-09T22:31:16.055Z
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
