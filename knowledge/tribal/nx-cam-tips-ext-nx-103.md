---
id: "nx-103"
title: "Toolpath Editor for Point-Level Modification"
source: "web:siemens-nx-docs"
confidence: 82
category: "cam_strategy"
tags: ["siemens-nx", "toolpath-editor", "point-edit", "local-correction", "override"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.401Z
---

# Toolpath Editor for Point-Level Modification

NX's Toolpath Editor allows modifying individual tool path points without regenerating the entire operation. Select a point or range of points and adjust feed rate, spindle speed, or tool position. Use this for localized corrections: reducing feed at a known hard-spot, adding a dwell at a corner, or shifting a single pass to avoid a clamping interference. Edits are stored as overrides — the base toolpath remains intact and can be regenerated without losing the edits if desired.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:siemens-nx-docs
**Operations:** roughing, finishing, 3-axis, 5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
