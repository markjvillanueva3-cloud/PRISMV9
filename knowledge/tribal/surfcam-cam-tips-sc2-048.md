---
id: "sc2-048"
title: "Threading with Multi-Pass Infeed Strategies"
source: "web:surfcam-lathe-threading"
confidence: 90
category: "cam_strategy"
tags: ["threading", "infeed", "flank", "spring-pass", "multi-pass"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.069Z
---

# Threading with Multi-Pass Infeed Strategies

SURFCAM threading supports radial infeed, flank infeed (29° or 30°), modified flank, and alternating flank methods. For external threads in steel, use modified flank infeed — the insert enters at 29° with diminishing depth on alternating flanks, producing better chip control than radial infeed. Set the number of passes based on thread pitch: 4-6 passes for fine pitch (<1.5mm), 8-12 for coarse pitch (>2mm). Always include 2 spring passes at final depth to eliminate elastic deflection.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-lathe-threading
**Operations:** threading

## Related
- [[bobcad-cam-tips-bc-046|Threading with Multi-Pass Infeed and Spring Passes]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[edgecam-cam-tips-ec-039|Threading with Multiple Pass Strategy]]
- [[fusion360-cam-tips-ext-f360-127|Threading Cycle with Spring Pass]]
