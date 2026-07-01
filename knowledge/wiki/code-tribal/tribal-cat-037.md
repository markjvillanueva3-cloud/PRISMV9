---
name: tribal-cat-037
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "groove", "insert-width", "peck", "turning"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-037.md
promoted_at: 2026-06-09T22:31:16.038Z
---

# Groove Turning Insert Width Must Match or Undersize Groove

When defining Groove Turning operations in CATIA, the grooving insert width must be equal to or smaller than the groove width. CATIA will error if the insert is wider than the groove. For grooves wider than the insert, CATIA automatically generates multiple plunge passes with lateral offsets. Set the lateral overlap to 0.1-0.2mm to prevent a ridge between passes. For deep grooves (depth > 3x width), enable peck grooving with 2-3mm peck increments to prevent chip packing.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** groove_turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[catia-cam-tips-cat-040|Bore Turning Requires Minimum Bore Diameter for Tool Clearance]]
