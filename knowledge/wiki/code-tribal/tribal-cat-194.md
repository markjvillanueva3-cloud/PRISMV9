---
name: tribal-cat-194
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "die", "draft-angle", "progressive", "punch"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-194.md
promoted_at: 2026-06-09T22:31:16.076Z
---

# Die Machining Draft Angle Strategy for Progressive Dies

Progressive die machining in CATIA requires careful handling of draft angles on punch and die profiles. Use CATIA's 'Draft Analysis' to identify all surfaces with draft, then machine drafted walls using Z-level finishing with the tool axis vertical (3-axis). For small draft angles (0.5-2°), the wall is nearly vertical and Z-level cutting produces good results. For larger drafts (5-15°), switch to multi-axis sweeping with the tool tilted to match the draft angle — this produces better surface finish and avoids scallop marks on the drafted face. Machine die clearance surfaces (below the cutting line) with 0.05mm extra stock for polishing.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-108|Multi-Tool Rest Machining for Progressive Corner Cleanup]]
- [[catia-cam-tips-cat-199|Hardened Steel Die Machining with CBN and High-Speed Strategy]]
- [[wedm-knowledge-tips-jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
