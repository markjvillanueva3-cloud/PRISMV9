---
name: tribal-cat-204
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "associativity", "design-update", "recompute", "dependency"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-204.md
promoted_at: 2026-06-09T22:31:16.079Z
---

# Tool Path Associativity with CATIA Design Model Updates

CATIA machining operations maintain geometric associativity with the design model — when the part shape changes, tool paths are flagged for recomputation. Associativity levels: (1) 'Broken' — referenced geometry deleted, operation must be re-specified, (2) 'Outdated' — referenced geometry modified, automatic recompute possible, (3) 'Up to Date' — no design changes affect this operation. Use 'Update All' in the Manufacturing Program to recompute all outdated operations after a design change. For large programs (50+ operations), use 'Selective Update' to recompute only affected operations — CATIA traces the dependency graph to identify which operations reference changed geometry. Expect 80-90% of operations to recompute without intervention on typical design iterations.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:catia-docs
**Operations:** automation

## Related
- [[catia-cam-tips-cat-173|FBM Interaction Detection for Feature Machining Order]]
- [[catia-cam-tips-cat-174|FBM Design Change Propagation to Machining Programs]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
