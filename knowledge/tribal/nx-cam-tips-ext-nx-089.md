---
id: "nx-089"
title: "Post Builder GUI Event Handler Configuration"
source: "web:siemens-nx-docs"
confidence: 85
category: "post_processor"
tags: ["siemens-nx", "post-builder", "event-handler", "gui", "configuration"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.391Z
---

# Post Builder GUI Event Handler Configuration

NX Post Builder's Event Handler GUI maps NX CAM events (tool change, start of path, end of path, cycle) to output blocks without requiring TCL coding. Configure the Start of Program event to output your shop header block (program number, date, machine ID, safety line). Map End of Program to output M30 followed by a rewind stop. For each event, drag output blocks from the block library into the sequence pane. This visual approach catches missing output blocks that are invisible in TCL scripts.

**Category:** post_processor
**Confidence:** 85
**Source:** web:siemens-nx-docs
**Operations:** post-processing

## Related
- [[nx-cam-tips-ext-nx-090|TCL Customization for Dynamic Output Formatting]]
- [[nx-cam-tips-ext-nx-091|Multi-Axis Post Configuration for Table-Table Machines]]
- [[nx-cam-tips-ext-nx-093|Custom Cycle Support with User-Defined Events]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
