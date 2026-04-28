---
id: "nx-093"
title: "Custom Cycle Support with User-Defined Events"
source: "web:siemens-nx-docs"
confidence: 84
category: "post_processor"
tags: ["siemens-nx", "custom-cycles", "ude", "post-builder", "canned-cycles"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.394Z
---

# Custom Cycle Support with User-Defined Events

Add custom canned cycle support in Post Builder by creating User Defined Events (UDEs) that map NX CAM cycle parameters to machine-specific G-code output. Define the UDE parameters (depth, dwell, retract height, feed) in the UDE editor, then create a TCL procedure to format the G-code block. Register the UDE in the post so NX recognizes it during posting. This is essential for machine-specific cycles like Heidenhain Cycle 32 (tolerance) or Fanuc G187 (smoothing) that have no direct NX CAM equivalent.

**Category:** post_processor
**Confidence:** 84
**Source:** web:siemens-nx-docs
**Operations:** post-processing

## Related
- [[nx-cam-tips-ext-nx-089|Post Builder GUI Event Handler Configuration]]
- [[nx-cam-tips-ext-nx-090|TCL Customization for Dynamic Output Formatting]]
- [[nx-cam-tips-ext-nx-091|Multi-Axis Post Configuration for Table-Table Machines]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
