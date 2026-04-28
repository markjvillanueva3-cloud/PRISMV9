---
id: "nx-060"
title: "Corner Cleanup with Reference Tool Diameter"
source: "web:siemens-nx-docs"
confidence: 86
category: "cam_strategy"
tags: ["siemens-nx", "cleanup-corners", "rest-finishing", "reference-tool", "fillets"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.369Z
---

# Corner Cleanup with Reference Tool Diameter

NX's Cleanup Corners operation automatically identifies fillets and corners where the previous finishing tool was too large to reach. Specify the Reference Tool diameter (the prior tool) and NX generates passes only in the remaining material zones. Set the corner cleanup tool to 50-60% of the reference tool diameter for optimal coverage. Enable IPW-based computation to account for actual remaining stock rather than theoretical geometry, catching any areas the previous tool missed due to engagement limitations.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** finishing, 3-axis

## Related
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[solidcam-cam-tips-sc-066|HSM Pencil Tracing — Clean Internal Fillets in One Pass]]
- [[solidcam-cam-tips-sc-173-2|Steep-Shallow Automatic Assignment]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
