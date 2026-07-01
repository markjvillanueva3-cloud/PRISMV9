---
name: tribal-cat-042
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "axial", "center-drill", "deep-hole", "turning"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-042.md
promoted_at: 2026-05-26T16:07:20.043Z
---

# Axial Operations Center Drill Before Deep Hole Drilling

In CATIA Lathe Machining, always program a center drilling operation before deep hole drilling or reaming axial operations. Use a 90-degree or 118-degree spot drill to a depth of 1.5-2x the subsequent drill diameter. This establishes a pilot cone that guides the twist drill and prevents walking. In the CATIA operation sequence, set the center drill as a prerequisite in the Manufacturing Program tree so it cannot be accidentally reordered after the through-drill.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** axial_turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
