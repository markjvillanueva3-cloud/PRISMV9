---
name: tribal-bc-141
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["bobcam-solidworks", "feature-based", "feature-tree", "auto-generation"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-141.md
promoted_at: 2026-06-09T22:31:15.966Z
---

# BobCAM for SOLIDWORKS Feature-Based Machining from Part Features

BobCAM for SOLIDWORKS can extract machining features directly from the SOLIDWORKS feature tree. Extruded cuts become pocket operations, holes become drilling cycles, and chamfers become contour operations. Right-click a SOLIDWORKS feature and select 'Create BobCAM Operation' to auto-generate the appropriate toolpath with default parameters. This is faster than manual geometry selection but requires well-organized SOLIDWORKS feature trees. Features created by Boolean operations or surface trimming may not map cleanly — verify geometry selection after auto-generation.

**Category:** setup
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** roughing, finishing, drilling

## Related
- [[bobcad-cam-tips-bc-139|BobCAM for SOLIDWORKS Assembly-Level Machining Setup]]
- [[bobcad-cam-tips-bc-143|BobCAM for SOLIDWORKS Design-to-Manufacturing Workflow]]
- [[gibbscam-cam-tips-gc-164|GibbsCAM feature-based machining (FBM) auto-recognizes holes and pockets from solids]]
- [[surfcam-cam-tips-sc2-129|SURFCAM Traditional Geometry-Based Workflow vs 2023 Feature Tree]]
