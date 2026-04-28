---
id: "wnc-112"
title: "Automatic Stock Detection Finds All Remaining Material"
source: "web:worknc-autostock"
confidence: 92
category: "cam_strategy"
tags: ["auto-stock", "detection", "comprehensive", "accuracy"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.708Z
---

# Automatic Stock Detection Finds All Remaining Material

WorkNC's automatic stock detection scans the dynamic stock model to identify all regions where material remains above the target surface plus stock allowance. The detection uses the actual machined state (not theoretical) for maximum accuracy. Minimum rest material = stock allowance + tolerance + 0.05 mm. This comprehensive detection ensures no unmachined zones are missed.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-autostock
**Operations:** rest_machining

## Related
- [[bobcad-cam-tips-bc-020|Island Machining with Automatic Detection and Multi-Level]]
- [[camworks-cam-tips-cw-035|Flat Area Detection — Automatic Identification of Horizontal Surfaces]]
- [[catia-cam-tips-cat-009|Closed Pocket Island Detection and Machining Strategy]]
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
