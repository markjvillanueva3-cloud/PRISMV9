---
name: tribal-cat-105
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "re-machining", "residual-stock", "detection", "rest"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-105.md
promoted_at: 2026-06-09T22:31:16.054Z
---

# Re-Machining Detects Residual Stock from Previous Operations

CATIA Re-Machining automatically detects areas where the previous operation left residual stock (due to tool size, access limitations, or step-down artifacts) and generates targeted tool paths only in those areas. Reference the previous operation in the Re-Machining setup — CATIA computes the swept volume of the prior tool and finds the difference from the part surface. Use a tool 40-60% smaller than the previous tool to access residual pockets. This avoids re-machining the entire surface, saving 30-50% of finishing time.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** finishing, rest_machining

## Related
- [[catia-cam-tips-cat-107|Automatic Rest Detection Threshold Settings]]
- [[catia-cam-tips-cat-009|Closed Pocket Island Detection and Machining Strategy]]
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-108|Multi-Tool Rest Machining for Progressive Corner Cleanup]]
