---
id: "f360-118"
title: "Steep and Shallow Automatic Detection"
source: "web:fusion360-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["fusion360", "steep-shallow", "manufacturing-extension", "finishing", "surface-quality"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.720Z
---

# Steep and Shallow Automatic Detection

The Manufacturing Extension's Steep and Shallow strategy automatically classifies surfaces by their draft angle relative to the tool axis. Surfaces steeper than the threshold (default 45 degrees, adjustable 30-60) receive contour-style constant-Z passes, while shallow areas get scallop or raster passes. This eliminates the need to manually split finishing into separate Contour and Scallop operations. Set the overlap region to 2-5 degrees wider than the transition angle to avoid witness lines at the steep/shallow boundary.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:fusion360-docs
**Operations:** 3d_finishing

## Related
- [[fusion360-cam-tips-ext-f360-064|Lead and Lag Angles for 5-Axis Surface Quality]]
- [[fusion360-cam-tips-ext-f360-096|Automated Tool Selection via Machining Advisors]]
- [[fusion360-cam-tips-ext-f360-097|Steep and Shallow Remove Cusps at Junctions]]
- [[fusion360-cam-tips-ext-f360-098|Automatic Strategy Generation from Part Analysis]]
- [[fusion360-cam-tips-ext-f360-111|Lead-In/Lead-Out Optimization for Finishing Passes]]
