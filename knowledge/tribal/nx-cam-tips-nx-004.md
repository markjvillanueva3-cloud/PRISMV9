---
id: "nx-004"
title: "VBM Setup Context with Fixtures"
source: "web:siemens-docs"
confidence: 83
category: "setup"
tags: ["nx", "vbm", "fixtures", "collision-check", "setup"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.497Z
---

# VBM Setup Context with Fixtures

Program VBM operations in the context of the complete setup including workpiece, fixtures, and clamps. NX uses these components for collision checking during toolpath generation, so including fixture geometry prevents gouges and crashes. Define the fixture bodies in the Workpiece group before creating VBM operations.

**Category:** setup
**Confidence:** 83
**Source:** web:siemens-docs
**Operations:** roughing, 2.5-axis

## Related
- [[nx-cam-tips-nx-001|VBM Face Selection for Prismatic Volumes]]
- [[nx-cam-tips-nx-002|VBM Volume Sequencing for Multi-Step Roughing]]
- [[nx-cam-tips-nx-003|VBM Associativity with CAD Changes]]
- [[nx-cam-tips-nx-005|VBM Quick Roughing for Accurate IPW Handoff]]
- [[nx-cam-tips-nx-028|Machine Tool Builder for ISV Setup]]
