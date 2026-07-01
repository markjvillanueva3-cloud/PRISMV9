---
name: tribal-nx-031
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["nx", "mill-turn", "dual-spindle", "ipw-transfer", "sub-spindle"]
confidence: 83
source: "web:siemens-docs"
promoted_from: knowledge/tribal/nx-cam-tips-nx-031.md
promoted_at: 2026-06-09T22:31:16.525Z
---

# Mill-Turn Dual Spindle IPW Transfer

When programming dual-spindle mill-turn in NX, define the WORKPIECE_SUB for the sub spindle and specify that IPW transfers from the main spindle. NX tracks the material state across the bar pull, cutoff, and sub-spindle pickup so subsequent operations machine from the correct stock shape. Verify the IPW at the transfer point to ensure part-off geometry is correct.

**Category:** setup
**Confidence:** 83
**Source:** web:siemens-docs
**Operations:** turning, mill-turn

## Related
- [[nx-cam-tips-nx-032|Mill-Turn Avoidance and Containment Planes]]
- [[nx-cam-tips-nx-033|Rotary Roughing for Cylindrical Turn-Mill Parts]]
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
- [[esprit-cam-tips-esp-148|Mill-Turn Spindle Synchronization for Part Transfer]]
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
