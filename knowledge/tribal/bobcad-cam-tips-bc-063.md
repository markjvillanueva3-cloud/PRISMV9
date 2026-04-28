---
id: "bc-063"
title: "Skim Cuts for Progressive Surface Finish Improvement"
source: "web:bobcad-wire-edm-skim"
confidence: 89
category: "cam_strategy"
tags: ["wire-edm", "skim-cuts", "surface-finish", "progressive", "offset"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.506Z
---

# Skim Cuts for Progressive Surface Finish Improvement

BobCAD Wire EDM custom skim passes progressively improve surface finish and accuracy. Typical sequence: rough cut with offset → skim 1 (0.15mm offset) → skim 2 (0.08mm) → skim 3 (0.04mm) → skim 4 (0.02mm) → final (0mm on-size). Each skim uses lower energy and higher wire speed. BobCAD supports independent lead-in/out per skim pass — use shorter leads on skim passes since the wire is already positioned near the profile.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-wire-edm-skim
**Operations:** wire_edm

## Related
- [[edgecam-cam-tips-ec-050|Wire EDM Skim Cuts for Progressive Surface Finish]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[esprit-cam-tips-esp-053|Wire EDM Skim Cuts for Surface Finish Progression]]
- [[surfcam-cam-tips-sc2-057|Skim Cuts for Surface Finish and Dimensional Accuracy]]
