---
id: "gc-010"
title: "Island avoidance with rest machining cleans up material around bosses"
source: "web:gibbscam-docs"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "island", "2.5d", "rest-machining", "cleanup"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.839Z
---

# Island avoidance with rest machining cleans up material around bosses

When pocketing around islands (bosses) in GibbsCAM, enable the rest machining option with the smaller tool diameter specified. The system automatically identifies unmachined material around island bases and generates cleanup passes. Set the 'Rest Stock Threshold' to 110% of the finishing tool radius—material zones smaller than this threshold are skipped to avoid micro-passes that increase cycle time without meaningful material removal.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-018|Rest machining with IPW tracks remaining stock for targeted cleanup]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
