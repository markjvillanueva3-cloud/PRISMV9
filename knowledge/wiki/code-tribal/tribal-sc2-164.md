---
name: tribal-sc2-164
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "skim-cuts", "multi-pass", "surface-finish", "offset"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-164.md
promoted_at: 2026-06-09T22:31:16.695Z
---

# SURFCAM Wire EDM Multi-Pass Skim Cut Strategies

SURFCAM programs wire EDM skim cuts as sequential passes with decreasing offsets and increasing power settings. A typical 4-pass strategy: roughing cut (full offset, high power), first skim (offset minus 0.03mm, medium power), second skim (offset minus 0.05mm, low power), finish skim (zero offset, micro-finish power). Set the number of skim passes and offset decrements in the cutting technology table. For Ra <0.2μm surface finish, use 5+ skim passes with the final pass at <0.5A peak current and 50ns pulse duration.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[edgecam-cam-tips-ec-050|Wire EDM Skim Cuts for Progressive Surface Finish]]
- [[esprit-cam-tips-esp-053|Wire EDM Skim Cuts for Surface Finish Progression]]
