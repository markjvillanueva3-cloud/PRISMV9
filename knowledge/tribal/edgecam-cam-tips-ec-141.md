---
id: "ec-141"
title: "Tombstone Tool-Based Sequencing for Minimum Changes"
source: "web:edgecam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["tombstone", "tool-sequencing", "tool-changes", "optimization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.376Z
---

# Tombstone Tool-Based Sequencing for Minimum Changes

Override Edgecam's default operation-based sequencing to use tool-based sequencing across all tombstone faces. In the Sequence Manager, group operations by tool number. The machine loads T1, machines all T1 operations across all four faces (with rotary index moves), then changes to T2. This reduces total tool changes from N×F (tools × faces) to N, saving 5-15 seconds per avoided tool change.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[gibbscam-cam-tips-gc-073|Tombstone tool grouping minimizes tool changes across all parts]]
- [[controller-knowledge-tips-ctrl-003|Fanuc extended work offsets G54.1 P1-P300]]
- [[edgecam-cam-tips-ec-137|Tombstone Multi-Face Programming with Rotary Indexing]]
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
