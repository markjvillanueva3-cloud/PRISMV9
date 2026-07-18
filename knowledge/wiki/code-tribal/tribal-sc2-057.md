---
name: tribal-sc2-057
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "skim-cuts", "trim-pass", "surface-finish", "accuracy"]
confidence: 90
source: "web:surfcam-wire-edm-skim"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-057.md
promoted_at: 2026-05-26T16:07:20.557Z
---

# Skim Cuts for Surface Finish and Dimensional Accuracy

SURFCAM Wire EDM skim cuts (trim passes) progressively improve surface finish and dimensional accuracy. The first rough cut removes the bulk material with offset. Subsequent skim cuts (typically 3-5 passes) reduce the offset in decreasing increments: 0.15mm → 0.08mm → 0.04mm → 0.02mm → 0mm (on-size). Each skim pass uses different power settings — lower energy with higher wire speed. The final skim achieves Ra 0.2-0.4 μm on hardened steel.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-wire-edm-skim
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[edgecam-cam-tips-ec-050|Wire EDM Skim Cuts for Progressive Surface Finish]]
- [[esprit-cam-tips-esp-053|Wire EDM Skim Cuts for Surface Finish Progression]]
- [[esprit-cam-tips-esp-156|Wire EDM Skim Cut Strategy for Surface Finish Optimization]]
