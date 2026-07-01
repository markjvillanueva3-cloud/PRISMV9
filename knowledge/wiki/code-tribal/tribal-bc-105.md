---
name: tribal-bc-105
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["air-cut", "stock-model", "castings", "cycle-time"]
confidence: 88
source: "web:bobcad-air-cut-reduction"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-105.md
promoted_at: 2026-06-09T22:31:15.958Z
---

# Air Cut Reduction with Stock Model Awareness

BobCAD air cut reduction detects toolpath segments not engaged with material and skips them. Most impactful on castings, forgings, and previously machined stock where the actual shape differs from the bounding box. The system uses the in-process stock model to identify air-cutting segments. Set minimum engagement threshold to 5% of tool diameter. Combine with 'Avoid Air Machining' in the advanced roughing options for maximum cycle time reduction.

**Category:** optimization
**Confidence:** 88
**Source:** web:bobcad-air-cut-reduction
**Operations:** roughing

## Related
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[gibbscam-cam-tips-gc-029|VoluMill air-cut elimination uses stock model to skip empty regions]]
- [[surfcam-cam-tips-sc2-009|TrueMill Air Cut Reduction via Stock Boundary Tracking]]
