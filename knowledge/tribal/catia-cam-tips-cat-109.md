---
id: "cat-109"
title: "Corner Rest Machining With Pencil Trace Combination"
source: "web:catia-docs"
confidence: 89
category: "cam_strategy"
tags: ["catia", "corner-rest", "pencil-trace", "fillet", "rest"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.886Z
---

# Corner Rest Machining With Pencil Trace Combination

Combine CATIA rest machining with pencil tracing for the most thorough corner cleanup. First, run rest machining (ZLevel or Sweeping strategy with a small tool) to clear the bulk of residual stock in corners. Then add a Pencil Trace operation targeting the internal fillet radii to remove the final material left by the ball-nose tip's tangent contact. The pencil trace tool diameter should equal or be slightly smaller than the minimum fillet radius. Run pencil traces at 50% of normal finishing feedrate for best surface quality.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** rest_machining, pencil

## Related
- [[catia-cam-tips-cat-018|Pencil Tracing Targets Fillet and Corner Residual Stock]]
- [[catia-cam-tips-cat-105|Re-Machining Detects Residual Stock from Previous Operations]]
- [[catia-cam-tips-cat-107|Automatic Rest Detection Threshold Settings]]
- [[catia-cam-tips-cat-108|Multi-Tool Rest Machining for Progressive Corner Cleanup]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
