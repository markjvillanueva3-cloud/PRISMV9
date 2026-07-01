---
name: tribal-nx-076
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "centrifugal-compressor", "covered-impeller", "point-milling", "shroud"]
confidence: 82
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-076.md
promoted_at: 2026-06-09T22:31:16.481Z
---

# Centrifugal Compressor Strategies with Covered Impellers

For covered (shrouded) impellers, NX Turbomachinery requires a point-milling approach since the shroud prevents SWARF access. Use the Multi-Blade Point Milling processor with a ball-nose endmill small enough to enter through the inlet. Set the maximum tool tilt to stay within the shroud opening angle. NX calculates the accessible volume and warns if any hub regions are unreachable, allowing you to plan EDM or alternate access strategies before committing to machining.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:siemens-nx-docs
**Operations:** roughing, finishing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
