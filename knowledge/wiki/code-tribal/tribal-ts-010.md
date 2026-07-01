---
name: tribal-ts-010
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-setup", "stock-transfer", "workflow", "operations"]
confidence: 93
source: "web:topsolid-multisetup"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-010.md
promoted_at: 2026-05-26T16:07:20.679Z
---

# Multi-Setup Machining in a Single Project Document

TopSolid allows programming of multiple setups (OP10, OP20, etc.) within a single CAM project document. Each setup has its own coordinate system, fixture definition, and stock model that inherits the as-machined state from the previous operation. The stock transfer between setups is automatic and accounts for all material removed. This gives a complete picture of the manufacturing process and prevents inter-setup interference.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-multisetup
**Operations:** general

## Related
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
- [[mastercam-cam-tips-mc-203|Multiple machine groups in one file enable multi-setup programming with coordinated fixtures]]
- [[surfcam-cam-tips-sc2-113|Multi-Setup Operations with Stock Transfer Between Setups]]
- [[worknc-cam-tips-wnc-198|WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
