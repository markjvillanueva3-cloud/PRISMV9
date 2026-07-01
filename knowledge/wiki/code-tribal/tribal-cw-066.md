---
name: tribal-cw-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "turning", "threading", "multi-pass", "infeed"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-066.md
promoted_at: 2026-05-26T16:07:19.895Z
---

# Threading — Multiple Passes with Decreasing Depth for Clean Threads

CAMWorks threading generates multiple passes with progressively decreasing depth of cut. For external threads, use modified flank infeed (alternating sides) to distribute wear evenly across both cutting edges. Set the number of passes based on thread pitch: fine threads (< 1mm pitch) need 4-6 passes, coarse threads (2-3mm pitch) need 8-12 passes. The final pass should be a spring pass at full depth with no material removal to clean up any elastic deformation.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** turning, threading

## Related
- [[camworks-cam-tips-cw-065|Grooving — Select Tool Width Relative to Groove Width for Optimal Cycles]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[fusion360-cam-tips-ext-f360-127|Threading Cycle with Spring Pass]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[topsolid-cam-tips-ts-046|Threading with Multiple Pass Strategies]]
