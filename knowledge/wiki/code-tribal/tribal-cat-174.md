---
name: tribal-cat-174
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "fbm", "design-change", "associativity", "update"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-174.md
promoted_at: 2026-06-09T22:31:16.071Z
---

# FBM Design Change Propagation to Machining Programs

One of FBM's strongest advantages is automatic propagation of design changes. When the design model is modified (holes added, pocket depth changed, feature removed), FBM re-runs recognition and updates the Manufacturing Program: new features get new operations, modified features recompute with updated parameters, deleted features have their operations removed. Enable 'Automatic Update' in the Manufacturing Program properties. After a design change, review the 'Update Status' column — green (fully updated), yellow (partially updated — needs review), red (broken link — feature topology changed beyond recognition). Aim for 90%+ green after typical design iterations.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** automation

## Related
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[catia-cam-tips-cat-170|FBM Manufacturing Rules for Hole Tolerance-Based Process Selection]]
- [[catia-cam-tips-cat-171|FBM Group Machining for Pattern Feature Optimization]]
- [[catia-cam-tips-cat-172|FBM User-Defined Feature Recognition for Custom Geometries]]
- [[catia-cam-tips-cat-173|FBM Interaction Detection for Feature Machining Order]]
