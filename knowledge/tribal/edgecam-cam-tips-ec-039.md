---
id: "ec-039"
title: "Threading with Multiple Pass Strategy"
source: "web:edgecam-turning"
confidence: 89
category: "cam_strategy"
tags: ["threading", "infeed", "flanking", "spring-pass"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.282Z
---

# Threading with Multiple Pass Strategy

Edgecam supports constant-depth, modified flanking, and alternating flank infeed for threading. Use modified flanking (29.5 degree infeed) for general purpose — it produces better chip formation than radial infeed. Set the number of passes based on thread pitch: 4-6 passes for fine pitch (<1.5mm), 8-12 for coarse pitch (2-3mm), 12-16 for large pitch (>3mm). Include 2-3 spring passes at final depth to clean up thread flanks. Verify thread entry/exit with sufficient run-out distance.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-turning
**Operations:** threading

## Related
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[fusion360-cam-tips-ext-f360-127|Threading Cycle with Spring Pass]]
- [[surfcam-cam-tips-sc2-048|Threading with Multi-Pass Infeed Strategies]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
