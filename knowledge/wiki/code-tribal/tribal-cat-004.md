---
name: tribal-cat-004
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "t-slot", "two-stage", "prismatic"]
confidence: 85
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-004.md
promoted_at: 2026-06-09T22:31:16.031Z
---

# T-Slot Machining Requires Two-Stage Approach

CATIA does not have a dedicated T-slot cycle — machine T-slots in two stages. First, rough the central slot with a standard end mill using a Pocketing or Channel operation. Then use a Profile Contouring operation with a T-slot cutter, referencing the slot bottom geometry. Set axial depth to match the T-slot cutter head height exactly, and reduce feedrate to 50% of normal since the cutter is fully engaged on both sides.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:catia-docs
**Operations:** pocketing, profile_contouring

## Related
- [[catia-cam-tips-cat-130|Prismatic T-Slot Machining Using Multi-Tool Sequencing]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
