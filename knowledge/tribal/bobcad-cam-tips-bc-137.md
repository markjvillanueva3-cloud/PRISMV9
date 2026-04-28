---
id: "bc-137"
title: "BobCAD V36 Operation Cloning for Multi-Feature Parts"
source: "web:bobcad-docs"
confidence: 0.86
category: "setup"
tags: ["v36", "operation-cloning", "multi-feature", "bulk-updates", "productivity"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.564Z
---

# BobCAD V36 Operation Cloning for Multi-Feature Parts

V36's operation cloning duplicates a complete operation (with all parameters) and re-associates it with different geometry. For parts with multiple identical pockets, program one pocket fully, then clone the operation and select the next pocket geometry. All speeds, feeds, depth settings, and linking parameters are preserved. Combine with pattern features for bolt circles — clone the drilling operation and select the next hole group. This is faster than copy/paste because cloning maintains a link to the original parameters for bulk updates later.

**Category:** setup
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** roughing, finishing, drilling

## Related
- [[bobcad-cam-tips-bc-129|BobCAD V36 Dynamic Machining Maintains Constant Chip Load]]
- [[bobcad-cam-tips-bc-130|BobCAD V36 Advanced Toolpath Simulation with G-Code Verification]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
- [[bobcad-cam-tips-bc-135|BobCAD V36 High-Speed Machining Output Optimization]]
