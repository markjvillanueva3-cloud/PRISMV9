---
id: "f360-086"
title: "In-App Simulation Resolution for Detecting Small Gouges"
source: "web:fusion360-docs"
confidence: 86
category: "cam_strategy"
tags: ["fusion360", "simulation", "resolution", "gouge-detection", "comparison"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.695Z
---

# In-App Simulation Resolution for Detecting Small Gouges

Increase the stock simulation resolution to Fine or Ultra Fine when verifying finishing passes on tight-tolerance parts. The default Medium resolution can miss gouges smaller than 0.1mm. Ultra Fine simulation takes 3-5x longer to compute but reveals sub-0.05mm deviations. After simulation, use the Comparison feature to overlay the simulated stock against the CAD model — color-mapped deviations instantly highlight undercutting (red) and excess material (blue).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** simulation

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-090|Stock Model Updates Between Operations]]
- [[fusion360-cam-tips-ext-f360-159|Simulation Speed Control for Collision Investigation]]
- [[fusion360-cam-tips-ext-f360-160|Cycle Time Estimation from Simulation]]
- [[catia-cam-tips-cat-055|Stock Model Accuracy Affects Simulation Fidelity]]
