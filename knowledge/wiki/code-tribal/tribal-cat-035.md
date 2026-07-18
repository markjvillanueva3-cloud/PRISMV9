---
name: tribal-cat-035
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "roughing", "longitudinal", "turning"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-035.md
promoted_at: 2026-06-09T22:31:16.038Z
---

# Lathe Roughing Strategy Selection Based on Material Hardness

In CATIA Lathe Machining, choose between longitudinal roughing (parallel to Z-axis) for long slender parts and face roughing (parallel to X-axis) for short wide parts. For hardened materials (>45 HRC), use the Contour Roughing strategy which follows the part profile at each depth of cut, maintaining more consistent engagement than linear passes. Set the depth of cut to 0.5-1.5mm for carbide inserts and 0.1-0.3mm for ceramic inserts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** rough_turning

## Related
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[catia-cam-tips-cat-040|Bore Turning Requires Minimum Bore Diameter for Tool Clearance]]
