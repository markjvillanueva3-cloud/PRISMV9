---
name: tribal-sc2-088
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["air-cut", "reduction", "stock-model", "castings", "cycle-time"]
confidence: 88
source: "web:surfcam-aircut-reduction"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-088.md
promoted_at: 2026-06-09T22:31:16.679Z
---

# Air Cut Reduction Skips Empty Passes

SURFCAM air cut reduction detects toolpath segments where the tool is not engaged with material (cutting air) and eliminates them. This is most impactful in roughing operations on parts where the stock shape differs significantly from a rectangular block — castings, forgings, and previously machined parts. Enable air cut reduction and set the minimum engagement threshold to 5% of tool diameter. The system uses the in-process stock model to identify air-cutting segments.

**Category:** optimization
**Confidence:** 88
**Source:** web:surfcam-aircut-reduction
**Operations:** roughing

## Related
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[gibbscam-cam-tips-gc-029|VoluMill air-cut elimination uses stock model to skip empty regions]]
- [[surfcam-cam-tips-sc2-009|TrueMill Air Cut Reduction via Stock Boundary Tracking]]
