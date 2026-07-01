---
name: tribal-cw-075
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "skim-cuts", "surface-finish", "accuracy"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-075.md
promoted_at: 2026-05-26T16:07:19.898Z
---

# Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy

Program 3-5 skim (trim) cuts after the rough cut to progressively improve surface finish and dimensional accuracy. Each skim uses lower power settings and smaller wire offset. Typical sequence for tool steel: rough cut (0.15mm offset, 8μm Ra) → skim 1 (0.08mm, 3μm Ra) → skim 2 (0.03mm, 1.5μm Ra) → skim 3 (0.01mm, 0.8μm Ra). The final skim may use DC power supply for mirror-finish applications. Total skim time is typically 30-50% of rough cut time.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-057|Skim Cuts for Surface Finish and Dimensional Accuracy]]
- [[camworks-cam-tips-cw-078|Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[edgecam-cam-tips-ec-050|Wire EDM Skim Cuts for Progressive Surface Finish]]
