---
name: tribal-cw-043
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "3d-machining", "rest-machining", "stock-model", "multi-tool"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-043.md
promoted_at: 2026-05-26T16:07:19.864Z
---

# Rest Machining — Automatic Stock Model for Multi-Tool Finishing

CAMWorks rest machining uses the stock model from previous operations to identify unmachined regions. After roughing with a large tool, rest machining targets only the remaining material with a smaller tool. Enable automatic stock model updating between operations — manual stock models can miss regions and cause air cutting or crashes. Rest machining is essential for mold work where fillet radii require progressively smaller tools to achieve final geometry.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** 3d_finishing, rest_roughing

## Related
- [[camworks-cam-tips-cw-026|Rest from VoluMill — Chain Multiple Tool Sizes for Complete Roughing]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[surfcam-cam-tips-sc2-029|3D Rest Machining from Stock Model Reference]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[camworks-cam-tips-cw-034|Z-Level Finish — Constant-Z Contouring for Steep Walls]]
