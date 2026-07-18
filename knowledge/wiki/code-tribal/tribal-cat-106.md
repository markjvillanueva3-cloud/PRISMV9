---
name: tribal-cat-106
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "rest-machining", "chain", "multi-step", "reference"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-106.md
promoted_at: 2026-06-09T22:31:16.054Z
---

# Previous Operation Reference Chain for Multi-Step Rest Machining

CATIA rest machining can reference a chain of previous operations to compute the cumulative material removed. When building a multi-step finishing sequence (e.g., 16mm ball → 10mm ball → 6mm ball → 3mm ball), each operation should reference all prior operations in the chain, not just the immediately preceding one. This prevents the smaller tool from re-cutting areas already finished by intermediate tools. Set up the reference chain in the Rest Material tab by selecting multiple source operations.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** finishing, rest_machining

## Related
- [[catia-cam-tips-cat-054|Machine Builder Kinematic Chain Definition Order]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
