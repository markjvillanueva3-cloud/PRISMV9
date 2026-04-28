---
id: "nx-045"
title: "VBM Rest Material Detection with Smaller Tool Reference"
source: "web:siemens-nx-docs"
confidence: 88
category: "cam_strategy"
tags: ["siemens-nx", "vbm", "rest-material", "reference-tool", "cycle-time"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.358Z
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
