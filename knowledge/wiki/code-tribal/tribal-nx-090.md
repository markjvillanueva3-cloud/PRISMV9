---
name: tribal-nx-090
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["siemens-nx", "post-builder", "tcl", "mom-variables", "dynamic-output"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-090.md
promoted_at: 2026-06-09T22:31:16.485Z
---

# TCL Customization for Dynamic Output Formatting

Use TCL procedures in the .tcl post file to implement dynamic output formatting that the Post Builder GUI cannot handle. Access MOM variables ($mom_tool_diameter, $mom_spindle_speed, $mom_feed_rate) to build conditional logic. For example: output G43 H-number for tools under 50 mm and G43.4 for tools over 50 mm on a Fanuc 30i. Place custom TCL code in the PB_CMD_before_motion and PB_CMD_after_motion procedures for maximum control over motion output without disrupting the core event structure.

**Category:** post_processor
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** post-processing

## Related
- [[nx-cam-tips-ext-nx-089|Post Builder GUI Event Handler Configuration]]
- [[nx-cam-tips-ext-nx-091|Multi-Axis Post Configuration for Table-Table Machines]]
- [[nx-cam-tips-ext-nx-093|Custom Cycle Support with User-Defined Events]]
- [[nx-cam-tips-ext-nx-127|Post Builder Advanced Customization]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
