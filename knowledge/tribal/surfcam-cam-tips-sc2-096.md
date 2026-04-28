---
id: "sc2-096"
title: "Reaming with Controlled Feed and Speed for Accuracy"
source: "web:surfcam-drilling-ream"
confidence: 88
category: "cam_strategy"
tags: ["reaming", "g85", "hole-finish", "stock-allowance", "dwell"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.105Z
---

# Reaming with Controlled Feed and Speed for Accuracy

SURFCAM reaming uses G85 (feed-in, feed-out) with carefully controlled speeds and feeds. Ream at 50-70% of the drilling speed and 2-3x the drilling feed rate for optimal hole finish. The reamer should remove 0.1-0.3mm per side (total stock = 0.2-0.6mm). Program a 0.5-second dwell at the bottom before retraction to allow the reamer to size the hole. For blind holes, set the reaming depth 2mm shorter than the drilled depth to avoid bottoming out.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-drilling-ream
**Operations:** reaming, drilling

## Related
- [[bobcad-cam-tips-bc-112|Reaming for Precision Hole Finishing]]
- [[esprit-cam-tips-esp-082|Reaming Cycle with Controlled Feed and Dwell]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[catia-cam-tips-cat-116|Reaming Requires Precise Pilot Hole and Low Feed]]
