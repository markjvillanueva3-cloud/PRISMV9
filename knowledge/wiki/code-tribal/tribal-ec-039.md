---
name: tribal-ec-039
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["threading", "infeed", "flanking", "spring-pass"]
confidence: 89
source: "web:edgecam-turning"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-039.md
promoted_at: 2026-06-09T22:31:16.169Z
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
