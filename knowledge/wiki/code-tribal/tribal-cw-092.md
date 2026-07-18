---
name: tribal-cw-092
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "optimization", "linking", "retract", "transitions"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-092.md
promoted_at: 2026-06-09T22:31:16.007Z
---

# Linking Strategy — Optimize Retract and Transition Moves

Linking strategy controls how the tool moves between cutting passes: direct, minimum retract, full retract, or smoothed arc transitions. Use minimum retract for roughing to save time (retract only enough to clear the stock plus 1mm). Use smoothed arc transitions for finishing to avoid sharp direction changes that leave marks on the surface. For 5-axis, use smooth linking to prevent abrupt rotary axis movements during transitions that can stall the machine or damage bearings.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, 3d_finishing

## Related
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[topsolid-cam-tips-ts-127|TopSolid'Cam 7 Automatic Toolpath Linking — Optimized Transition Moves]]
- [[worknc-cam-tips-wnc-100|Linking Optimization Minimizes Non-Cutting Time]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
