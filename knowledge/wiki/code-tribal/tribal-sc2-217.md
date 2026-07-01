---
name: tribal-sc2-217
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["material-removal", "dexel", "resolution", "stock-color-map", "gouge-detection"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-217.md
promoted_at: 2026-06-09T22:31:16.707Z
---

# SURFCAM Material Removal Simulation Accuracy Settings

SURFCAM's material removal simulation uses a dexel-based model to represent the workpiece. The dexel resolution (grid spacing) controls simulation accuracy — finer resolution catches thinner remaining stock but increases computation time. Set resolution to 0.1-0.2mm for finishing verification (catches stock >0.1mm) and 0.5-1.0mm for roughing (catches gross errors). After simulation, inspect the remaining stock color map: green = within tolerance, yellow = excess stock (0.05-0.2mm), red = gouge. Zoom into corners, fillets, and thin walls where gouge risk is highest.

**Category:** verification
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** roughing, finishing

## Related
- [[edgecam-cam-tips-ec-187|Simulator Material Removal Visualization Resolution]]
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[bobcad-cam-tips-bc-086|Material Removal Simulation for Visual Verification]]
- [[camworks-cam-tips-cw-081|Material Removal Simulation — Visual Stock Verification at Each Operation]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
