---
name: tribal-cw-110
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "surface-quality", "tolerance", "chord-error", "accuracy"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-110.md
promoted_at: 2026-05-26T16:07:19.948Z
---

# Tolerance Control — Set Chord Error for Target Surface Quality

The machining tolerance (chord error) controls how closely the toolpath approximates the target surface. For general machining, use 0.01-0.02mm. For mold finishing, use 0.002-0.005mm. For optical/lens surfaces, use 0.001mm or less. Tighter tolerance = more toolpath points = larger file = slower execution on the machine. Balance tolerance against machine controller capability — there is no benefit setting 0.001mm tolerance if the machine cannot position more accurately than 0.005mm.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** 3d_finishing

## Related
- [[catia-cam-tips-cat-102|Machining Tolerance vs Surface Tolerance Distinction]]
- [[tebis-cam-tips-teb-048|Tolerance Setting Balances Surface Accuracy Against Cycle Time]]
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[camworks-cam-tips-cw-044|Constant Cusp Machining — Adaptive Step-Over for Uniform Ra]]
- [[camworks-cam-tips-cw-045|Simultaneous 5-Axis — Continuous Tool Orientation for Complex Surfaces]]
