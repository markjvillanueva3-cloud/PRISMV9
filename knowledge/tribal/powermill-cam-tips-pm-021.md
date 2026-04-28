---
id: "pm-021"
title: "Stock Model Resolution Affects Rest Machining Accuracy"
source: "web:powermill-docs"
confidence: 89
category: "cam_strategy"
tags: ["stock-model", "resolution", "rest-machining", "voxel"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.543Z
---

# Stock Model Resolution Affects Rest Machining Accuracy

Stock model resolution in PowerMill determines the voxel size used to represent remaining material. Set resolution to 0.5-1.0mm for roughing rest detection and 0.1-0.25mm for finishing rest detection. Low resolution misses small rest material pockets; high resolution increases calculation time exponentially. For a 300mm part, 0.5mm resolution creates ~216 million voxels — adequate for roughing. Finishing rest detection on the same part at 0.1mm creates ~27 billion voxels, so limit the stock model region to only the area of interest.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:powermill-docs
**Operations:** roughing, rest_machining

## Related
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[catia-cam-tips-cat-055|Stock Model Accuracy Affects Simulation Fidelity]]
- [[edgecam-cam-tips-ec-006|Rest Machining from Waveform with Smaller Cutter]]
