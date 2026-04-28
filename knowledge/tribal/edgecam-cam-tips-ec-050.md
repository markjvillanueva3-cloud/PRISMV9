---
id: "ec-050"
title: "Wire EDM Skim Cuts for Progressive Surface Finish"
source: "web:edgecam-wire-edm"
confidence: 89
category: "cam_strategy"
tags: ["wire-edm", "skim-cuts", "surface-finish", "progressive"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.290Z
---

# Wire EDM Skim Cuts for Progressive Surface Finish

Program multiple skim cuts in Edgecam to progressively improve surface finish. Typical progression: rough cut (Ra 3.0-4.0 um), first skim (Ra 1.0-1.5 um), second skim (Ra 0.4-0.6 um), third skim (Ra 0.15-0.25 um). Each skim uses reduced power and offset. Edgecam stores optimal skim parameters per machine brand in its technology tables. Three to five skims achieve mirror finish; additional skims yield diminishing returns.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-wire-edm
**Operations:** wire_edm_2axis, wire_edm_4axis

## Related
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[esprit-cam-tips-esp-053|Wire EDM Skim Cuts for Surface Finish Progression]]
- [[surfcam-cam-tips-sc2-057|Skim Cuts for Surface Finish and Dimensional Accuracy]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
