---
name: tribal-cat-109
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "corner-rest", "pencil-trace", "fillet", "rest"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-109.md
promoted_at: 2026-06-09T22:31:16.055Z
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
