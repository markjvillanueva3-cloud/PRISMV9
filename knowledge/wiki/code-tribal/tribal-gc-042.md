---
name: tribal-gc-042
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "swiss-type", "guide-bushing", "z-reference"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-042.md
promoted_at: 2026-06-09T22:31:16.322Z
---

# Swiss-type programming requires guide bushing offset for Z-axis accuracy

When programming Swiss-type lathes in GibbsCAM MTM, account for the guide bushing position. The bar stock slides through the guide bushing, so the Z-axis reference is at the guide bushing face, not the spindle. Set the 'Bar Stock Z Reference' to the guide bushing location. For parts machined close to the guide bushing, material stiffness is excellent allowing aggressive cuts. As the bar extends further (>3× diameter), reduce feed rates by 15-25% to prevent whipping. GibbsCAM MTM tracks the bar position relative to the guide bushing throughout the program for accurate stock simulation.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[esprit-cam-tips-esp-130|Guide Bushing Compensation for Swiss-Type Z-Axis]]
- [[surfcam-cam-tips-sc2-155|SURFCAM Swiss-Type Turning with Guide Bushing Compensation]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
