---
id: "ec-097"
title: "Spot Drilling for Hole Location Accuracy"
source: "web:edgecam-drilling"
confidence: 89
category: "cam_strategy"
tags: ["spot-drill", "hole-location", "accuracy", "feature"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.327Z
---

# Spot Drilling for Hole Location Accuracy

Always program spot drilling before twist drilling in Edgecam. Use 90-degree spot drill for standard drilling, 120-degree for carbide drills (matching drill point angle). Set spot depth to create a cone slightly larger than the drill web — typically 10-20% of drill diameter deep. Edgecam's feature recognition can automatically add spot drilling when the require-spot option is enabled in machining templates.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-drilling
**Operations:** spot_drilling

## Related
- [[esprit-cam-tips-esp-078|Spot Drilling for Accurate Hole Location]]
- [[camworks-cam-tips-cw-097|Spot Drilling — Establish Accurate Hole Location Before Full Drill]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[mastercam-cam-tips-mc-158|Spot and center drill strategy prevents drill walking on angled or curved entry surfaces]]
