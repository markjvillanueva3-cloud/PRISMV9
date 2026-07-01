---
name: tribal-cat-173
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "fbm", "interaction", "machining-order", "dependency"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-173.md
promoted_at: 2026-06-09T22:31:16.071Z
---

# FBM Interaction Detection for Feature Machining Order

CATIA FBM detects feature interactions — geometric overlaps between recognized features that affect machining order. For example, a pocket intersecting a through-hole must be machined before the hole to prevent drill walking on the pocket wall. FBM's 'Interaction Analysis' identifies these dependencies and enforces the correct machining sequence. Review the interaction graph in the Manufacturing Program tree — CATIA displays arrows indicating required feature-machining order. Override only when shop-floor experience contradicts the geometric analysis (rare — typically for thin-wall deflection considerations that geometry alone cannot capture).

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:catia-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[catia-cam-tips-cat-170|FBM Manufacturing Rules for Hole Tolerance-Based Process Selection]]
- [[catia-cam-tips-cat-171|FBM Group Machining for Pattern Feature Optimization]]
- [[catia-cam-tips-cat-172|FBM User-Defined Feature Recognition for Custom Geometries]]
- [[catia-cam-tips-cat-174|FBM Design Change Propagation to Machining Programs]]
