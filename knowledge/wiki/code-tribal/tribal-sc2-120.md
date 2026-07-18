---
name: tribal-sc2-120
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["reference-tool-rest", "approximate", "fast-computation", "roughing"]
confidence: 87
source: "web:surfcam-ref-tool-rest"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-120.md
promoted_at: 2026-06-09T22:31:16.686Z
---

# Reference Tool Rest for Quick Approximate Rest Machining

When computation time is a concern, SURFCAM reference-tool rest machining approximates the remaining stock by offsetting the design surface by the previous tool's radius. This is faster to compute than stock-model rest but less accurate — it generates toolpath in areas where the previous tool actually reached but the reference approximation says it didn't. Use for roughing rest where minor over-machining is acceptable, not for finish rest where accuracy matters.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:surfcam-ref-tool-rest
**Operations:** rest_machining, roughing

## Related
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[camworks-cam-tips-cw-054|5-Axis Roughing — Plunge and Adaptive Strategies for Deep Cavities]]
- [[camworks-cam-tips-cw-063|Turn Roughing — Optimize Stock Removal with Proper Depth of Cut Sequence]]
