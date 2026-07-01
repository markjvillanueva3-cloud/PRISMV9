---
name: tribal-nx-091
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["siemens-nx", "post-builder", "multi-axis", "table-table", "rtcp"]
confidence: 88
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-091.md
promoted_at: 2026-06-09T22:31:16.485Z
---

# Multi-Axis Post Configuration for Table-Table Machines

When configuring a Post Builder post for a table-table 5-axis machine, set the 4th axis as the primary rotation (A or B) and the 5th axis as the secondary rotation (C). Define the rotary axis directions, zero positions, and travel limits matching the machine's actual kinematics. Enable RTCP/TCP output (G43.4 Fanuc, TRAORI Siemens) so the controller compensates for rotary axis pivot point offsets. Incorrect pivot point definition causes positional errors of 0.1-0.5 mm on inclined surfaces.

**Category:** post_processor
**Confidence:** 88
**Source:** web:siemens-nx-docs
**Operations:** post-processing

## Related
- [[nx-cam-tips-ext-nx-089|Post Builder GUI Event Handler Configuration]]
- [[nx-cam-tips-ext-nx-090|TCL Customization for Dynamic Output Formatting]]
- [[nx-cam-tips-ext-nx-093|Custom Cycle Support with User-Defined Events]]
- [[nx-cam-tips-ext-nx-127|Post Builder Advanced Customization]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
