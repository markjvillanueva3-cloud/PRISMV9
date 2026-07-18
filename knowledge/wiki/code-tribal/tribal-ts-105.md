---
name: tribal-ts-105
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["air-cut", "reduction", "efficiency", "stock-detection"]
confidence: 91
source: "web:topsolid-aircut"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-105.md
promoted_at: 2026-05-26T16:07:21.065Z
---

# Air Cut Reduction Skips Empty Passes

TopSolid's air cut detection identifies toolpath segments where the tool is not engaged with material and either removes them entirely or converts them to rapid moves. This is most effective for rest machining operations where only small pockets of material remain. Enable 'Skip empty passes' to eliminate passes that would cut only air. For Z-level roughing on near-net-shape stock, this can eliminate 40-60% of the total toolpath length.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-aircut
**Operations:** roughing, rest_machining

## Related
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
- [[worknc-cam-tips-wnc-101|Air Cut Reduction Eliminates Empty Passes]]
- [[topsolid-cam-tips-ts-014|Rest Roughing Automatically Targets Unmachined Regions]]
- [[worknc-cam-tips-wnc-017|Rest from Roughing Targets Unmachined Stock Zones]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
