---
name: tribal-cim-026
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["scallop", "cusp-height", "quality", "variable-step"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-026.md
promoted_at: 2026-06-09T22:31:16.087Z
---

# Surface Quality Optimization via Scallop Control

Control surface quality by setting target scallop height rather than fixed step-over. In Cimatron, set 'Quality' parameter to the target cusp height (e.g., 0.005mm for polishing-ready surfaces). The system automatically varies step-over based on local surface curvature — tighter in high-curvature regions, wider on flat areas. This balances quality and cycle time optimally.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:cimatron-docs
**Operations:** finishing

## Related
- [[topsolid-cam-tips-ts-091|Scallop Control Sets Maximum Cusp Height]]
- [[worknc-cam-tips-wnc-088|Scallop Control Sets Maximum Cusp Height]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
