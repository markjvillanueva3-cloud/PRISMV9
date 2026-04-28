---
id: "cat-173"
title: "FBM Interaction Detection for Feature Machining Order"
source: "web:catia-docs"
confidence: 0.83
category: "cam_strategy"
tags: ["catia", "fbm", "interaction", "machining-order", "dependency"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.951Z
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
