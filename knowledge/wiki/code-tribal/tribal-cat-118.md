---
name: tribal-cat-118
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "composite", "ply-trimming", "cfrp", "cpd"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-118.md
promoted_at: 2026-06-09T22:31:16.057Z
---

# Ply Trimming Tool Path Generation from CATIA Composites Design

CATIA Composites Design (CPD) defines ply boundaries, fiber directions, and stacking sequences that feed directly into machining operations. When generating ply trimming tool paths, reference the ply boundary curves from the CPD model rather than creating separate geometry. This maintains associativity — when the design changes ply boundaries, the trimming tool paths update automatically. Use a 2-3mm offset from the ply boundary for rough trim (allows for spring-back) and a 0mm offset for net trim. Specify diamond-coated or PCD router bits for CFRP trimming.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** composite_machining

## Related
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-208|Composite Edge Trimming with Dust Extraction Path Planning]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
- [[catia-cam-tips-cat-120|Stack Drilling Composites with Metallic Backing Plates]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
