---
name: tribal-mc-178
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "stock-model", "rest-machining", "in-process", "material-boundary", "chain"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-178.md
promoted_at: 2026-06-09T22:31:16.439Z
---

# Stock model generation from previous operations provides accurate rest material boundaries

In Mastercam, a stock model is a geometric representation of the in-process workpiece after one or more operations. Generate stock models by enabling 'Create Stock Model' on the Stock page of any roughing operation. The stock model captures the actual material remaining, including scallops, floors, and walls, at much higher fidelity than a simple offset of the part geometry. Use this stock model as the Stock input for the next operation — the subsequent toolpath only cuts where material actually exists, eliminating air cutting. Always generate stock models using the same construction plane to ensure alignment. For complex multi-operation sequences, chain stock models: Op1 creates Stock Model A, Op2 uses A as input and creates Stock Model B, Op3 uses B. This chain ensures each operation has an accurate picture of remaining material.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** roughing, semi_finishing

## Related
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-262|Rest machining with stock model reference precisely targets only remaining material from larger tool passes]]
- [[surfcam-cam-tips-sc2-065|Stock Model Tracking Across Multiple Operations]]
- [[surfcam-cam-tips-sc2-132|SURFCAM 2023 Stock Model Carries Accurate In-Process Geometry]]
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
