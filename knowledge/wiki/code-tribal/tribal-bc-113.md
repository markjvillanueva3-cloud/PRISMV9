---
name: tribal-bc-113
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["deep-hole", "gun-drill", "pattern-optimization", "nearest-neighbor"]
confidence: 87
source: "web:bobcad-deep-hole"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-113.md
promoted_at: 2026-06-09T22:31:15.960Z
---

# Deep Hole Drilling and Pattern Optimization

BobCAD deep hole drilling (L/D > 10) supports gun drill strategies with through-tool coolant at 70+ bar. Do not peck — gun drills rely on continuous flushing. For pattern drilling, BobCAD optimizes the drilling order to minimize rapid travel between holes. The optimization considers: nearest-neighbor sequencing, Z-level grouping (shallow holes first), and tool change minimization. For large hole patterns (50+ holes), the optimized order can save 2-5 minutes of rapid traverse time.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-deep-hole
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]]
- [[edgecam-cam-tips-ec-101|Deep Hole Drilling with Gun Drill Support]]
- [[esprit-cam-tips-esp-084|Deep Hole Drilling with Gun Drill Strategy]]
- [[fusion360-cam-tips-ext-f360-155|Gun Drill Programming in Fusion 360]]
- [[surfcam-cam-tips-sc2-097|Deep Hole Drilling with Gun Drill and BTA Strategies]]
