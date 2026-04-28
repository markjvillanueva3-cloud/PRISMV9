---
id: "ctrl-022"
title: "Haas NGC Setting 191 for smoothing tolerance"
source: "controller:haas_ngc_settings"
confidence: 92
category: "programming"
tags: ["haas", "ngc", "setting-191", "smoothing", "surface-finish"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.170Z
---

# Haas NGC Setting 191 for smoothing tolerance

Setting 191 (Smoothing Tolerance) on Haas NGC controls the contouring smoothness. Default is 0.05mm — too coarse for finish passes. Set to 0.005-0.01mm for finishing. This is Haas's equivalent of Fanuc's AICC or Siemens CYCLE832. Higher values = faster cycle time but visible faceting. Lower values = smoother finish but potential servo lag at high feed rates. Critical for 3D surfacing.

**Category:** programming
**Confidence:** 92
**Source:** controller:haas_ngc_settings

## Related
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-024|Haas NGC unique M-codes reference]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
- [[fusion360-cam-tips-ext-f360-085|Control-Specific G-Code Features in Post Output]]
- [[edgecam-cam-tips-ec-152|B-Axis Toolpath Smoothing for Surface Finish]]
