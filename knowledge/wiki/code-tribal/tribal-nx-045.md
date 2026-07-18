---
name: tribal-nx-045
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "vbm", "rest-material", "reference-tool", "cycle-time"]
confidence: 88
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-045.md
promoted_at: 2026-06-09T22:31:16.472Z
---

# VBM Rest Material Detection with Smaller Tool Reference

When programming VBM rest roughing, specify the previous tool's exact geometry (diameter + corner radius) in the Reference Tool field. NX computes the IPW from the prior operation and generates toolpaths only where the smaller rest tool can reach material the larger tool left behind. Omitting the reference tool causes NX to machine the entire volume, wasting 30-50% of cycle time on air cuts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:siemens-nx-docs
**Operations:** roughing, 2.5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
- [[nx-cam-tips-ext-nx-048|VBM Roughing to Finish Stock with Profile Stock Offset]]
