---
name: tribal-sc2-137
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["dynamic-stock", "rest-machining", "stock-boundary", "cycle-time"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-137.md
promoted_at: 2026-06-09T22:31:16.689Z
---

# SURFCAM 2023 Dynamic Stock Boundary Tightens Rest Machining

SURFCAM 2023's dynamic stock boundary recalculates the stock envelope after each operation, ensuring rest machining only targets actual remaining material. In Traditional SURFCAM, rest machining used a static stock definition that often included already-machined areas. Enable dynamic stock for multi-tool roughing sequences — a 25mm rougher followed by a 10mm rest-rougher will skip areas the first tool already cleared, reducing cycle time by 15-30% compared to static stock definitions.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** roughing

## Related
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[surfcam-cam-tips-sc2-009|TrueMill Air Cut Reduction via Stock Boundary Tracking]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
