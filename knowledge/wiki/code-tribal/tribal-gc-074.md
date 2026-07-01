---
name: tribal-gc-074
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "tombstone", "part-orientation", "multi-side", "setup-reduction"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-074.md
promoted_at: 2026-06-09T22:31:16.331Z
---

# Part orientation optimization reduces setups from multiple to single tombstone load

When a part requires machining from multiple sides, orient it on the tombstone so that each tombstone face presents a different side for machining. A 4-sided tombstone can machine 4 sides of a part in one setup with 4 rotary index positions. In GibbsCAM TMS, define the part orientation per face and assign the appropriate operations. This eliminates the need for multiple vise setups and reduces total setup time from 4 individual setups to 1 tombstone load. For 5-sided parts, combine tombstone faces with a top-of-part access position.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[gibbscam-cam-tips-gc-122|GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
