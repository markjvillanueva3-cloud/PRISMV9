---
name: tribal-bc-139
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["bobcam-solidworks", "assembly", "fixture", "collision", "configurations"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-139.md
promoted_at: 2026-06-09T22:31:15.966Z
---

# BobCAM for SOLIDWORKS Assembly-Level Machining Setup

BobCAM for SOLIDWORKS operates within the SOLIDWORKS assembly environment, allowing fixture components and the workpiece to be defined as separate parts. Set the workpiece as the 'Stock' component and fixture parts as 'Fixture' in BobCAM's setup. The system automatically excludes fixture geometry from machining while including it in collision detection. When the SOLIDWORKS assembly updates (e.g., fixture design change), BobCAM regenerates toolpaths against the new fixture geometry. Use assembly configurations to represent different machining setups (Op10, Op20) within one SOLIDWORKS file.

**Category:** setup
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** roughing, finishing, drilling

## Related
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
- [[cimatron-cam-tips-cim-193|Collision with Full Assembly and Safety Margin]]
- [[edgecam-cam-tips-ec-081|Holder Assembly Models for Collision Accuracy]]
- [[edgecam-cam-tips-ec-136|Edgecam Designer Assembly Mode for Multi-Component Fixtures]]
