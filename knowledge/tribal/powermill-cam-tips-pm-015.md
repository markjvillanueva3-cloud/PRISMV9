---
id: "pm-015"
title: "Steep and Shallow Threshold Tuning for Mold Surfaces"
source: "web:powermill-forum"
confidence: 90
category: "cam_strategy"
tags: ["steep-shallow", "mold", "threshold", "injection-mold", "polishing"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.538Z
---

# Steep and Shallow Threshold Tuning for Mold Surfaces

For injection mold cavities, set the steep/shallow threshold to 35° rather than the default 30°. This classifies more surface area as 'steep' and processes it with constant-Z passes, which produce better surface finish on near-vertical walls typical of mold draft angles. For molds with 1-3° draft, the constant-Z passes leave a uniform cusp height that is easier to polish than raster marks. Increase overlap to 3-4x stepover on A-surface mold regions.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:powermill-forum
**Operations:** finishing

## Related
- [[edgecam-cam-tips-ec-023|Steep and Shallow Hybrid Finishing Strategy]]
- [[esprit-cam-tips-esp-018|Steep/Shallow Boundary Detection for Hybrid Finishing]]
- [[catia-cam-tips-cat-193|Runner and Gate Machining with Specialized CATIA Operations]]
- [[mastercam-cam-tips-mc-147|Burnishing toolpaths in mold finishing use a ball tool at zero stock to polish hardened surfaces]]
- [[bobcad-cam-tips-bc-028|Steep/Shallow Hybrid Finishing for Optimal Surface Quality]]
