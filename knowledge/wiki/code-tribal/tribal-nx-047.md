---
name: tribal-nx-047
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "vbm", "cut-levels", "floor-grouping", "prismatic"]
confidence: 83
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-047.md
promoted_at: 2026-06-09T22:31:16.473Z
---

# VBM Multiple Cut Level Strategies for Stepped Features

For parts with multiple floor depths, use VBM's automatic cut level grouping to machine all features at the same Z-level in a single pass before stepping down. Set Group by Floor to ON and NX reorders cut levels to minimize Z retracts. This reduces non-cutting time by 15-25% on complex prismatic parts with 10+ floor elevations compared to feature-by-feature sequencing.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:siemens-nx-docs
**Operations:** roughing, 2.5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-048|VBM Roughing to Finish Stock with Profile Stock Offset]]
