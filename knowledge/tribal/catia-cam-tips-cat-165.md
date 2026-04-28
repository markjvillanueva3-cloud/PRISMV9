---
id: "cat-165"
title: "Material Removal Simulation with Stock Tracking Across Operations"
source: "web:catia-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["catia", "simulation", "material-removal", "stock-tracking", "rest-material"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.945Z
---

# Material Removal Simulation with Stock Tracking Across Operations

CATIA's Material Removal Simulation (MRS) maintains a volumetric stock model that updates incrementally across all operations in the Manufacturing Program. After each operation computes, the stock model reflects the material removed. This enables accurate rest-material detection for subsequent operations — the second roughing pass 'sees' what the first pass left behind. Enable 'Stock Update' mode in the Manufacturing Program properties. For complex multi-setup parts, freeze the stock model at each setup change and re-orient it to match the new fixture. Use 'Section Analysis' on the stock model to inspect material distribution at any cross-section.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-045|Rest Material Roughing References Previous Tool Size]]
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-055|Stock Model Accuracy Affects Simulation Fidelity]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
