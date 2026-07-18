---
name: tribal-nx-089
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["siemens-nx", "post-builder", "event-handler", "gui", "configuration"]
confidence: 85
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-089.md
promoted_at: 2026-06-09T22:31:16.484Z
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
