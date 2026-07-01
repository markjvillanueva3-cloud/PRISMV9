---
name: tribal-sc2-129
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["surfcam-traditional", "surfcam-2023", "feature-tree", "migration", "workflow"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-129.md
promoted_at: 2026-06-09T22:31:16.687Z
---

# SURFCAM Traditional Geometry-Based Workflow vs 2023 Feature Tree

SURFCAM Traditional uses a flat geometry-based workflow where operations reference wireframe/surface entities directly, while SURFCAM 2023+ introduces a feature tree with parent-child relationships between operations. When migrating from Traditional, rebuild operations in the feature tree rather than importing — imported Traditional files lose associativity. The feature tree enables automatic regeneration when geometry changes, saving 30-50% reprogramming time on ECOs.

**Category:** setup
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** roughing, finishing

## Related
- [[surfcam-cam-tips-sc2-130|SURFCAM 2023 Operation Manager Replaces Traditional Operation List]]
- [[bobcad-cam-tips-bc-141|BobCAM for SOLIDWORKS Feature-Based Machining from Part Features]]
- [[catia-cam-tips-cat-121|V5 Manufacturing Hub vs 3DEXPERIENCE NC Machine Builder Migration]]
- [[catia-cam-tips-cat-123|V5 CATTool vs 3DEXPERIENCE Tool Resource Management]]
- [[catia-cam-tips-cat-125|V5 Macro Migration to 3DEXPERIENCE EKL Automation]]
