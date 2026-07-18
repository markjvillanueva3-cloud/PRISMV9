---
name: tribal-cat-130
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "prismatic", "t-slot", "multi-tool", "sequencing"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-130.md
promoted_at: 2026-06-09T22:31:16.060Z
---

# Prismatic T-Slot Machining Using Multi-Tool Sequencing

T-slot machining in CATIA Prismatic requires a three-step sequence: (1) rough the vertical slot with an end mill using a Profile Pocketing operation, (2) rough the horizontal undercut with a T-slot cutter using a dedicated T-Slot operation from the Prismatic machining toolbar, (3) finish both surfaces. Define the T-slot cutter geometry accurately in the tool editor — specify both the shank diameter and the cutting head diameter/width. Set the 'Max Cut Depth' per pass to 2mm for the T-slot cutter to avoid overloading. CATIA computes the undercut geometry by subtracting the vertical slot from the T-slot profile.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** slotting

## Related
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
