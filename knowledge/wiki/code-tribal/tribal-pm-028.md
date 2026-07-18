---
name: tribal-pm-028
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["stock-model", "bounding-box", "large-parts", "calculation-time"]
confidence: 87
source: "web:powermill-forum"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-028.md
promoted_at: 2026-06-09T22:31:16.537Z
---

# Stock Model Reduces Calculation Time for Large Parts

For parts exceeding 500mm, limit stock model calculation to a bounding box around the region of interest rather than the entire part. In the stock model dialog, define a user boundary that encompasses only the area needing rest detection. This can reduce stock model calculation time from hours to minutes on large automotive or aerospace tooling. Combine with reduced resolution (0.5mm instead of 0.2mm) for roughing operations where high precision is unnecessary.

**Category:** optimization
**Confidence:** 87
**Source:** web:powermill-forum
**Operations:** roughing, rest_machining

## Related
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
