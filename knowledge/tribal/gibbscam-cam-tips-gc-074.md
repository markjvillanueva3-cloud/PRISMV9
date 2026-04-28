---
id: "gc-074"
title: "Part orientation optimization reduces setups from multiple to single tombstone load"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "tombstone", "part-orientation", "multi-side", "setup-reduction"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.889Z
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
