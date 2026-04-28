---
id: "ec-137"
title: "Tombstone Multi-Face Programming with Rotary Indexing"
source: "web:edgecam-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["tombstone", "rotary-indexing", "multi-face", "work-coordinates"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.373Z
---

# Tombstone Multi-Face Programming with Rotary Indexing

Program tombstone (4-sided fixture block) machining by defining each face as a separate setup with its own work coordinate system. Use the Machine Setup dialog to define the rotary axis positions (0°, 90°, 180°, 270° for 4-face tombstone). Each face references the tombstone datum — program G54.1 P1-P4 with rotary offset. Sequence operations face-by-face to minimize rotary index moves.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[esprit-cam-tips-esp-037|Indexed 3+2 Machining for Multi-Face Parts]]
- [[controller-knowledge-tips-ctrl-003|Fanuc extended work offsets G54.1 P1-P300]]
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[edgecam-cam-tips-ec-141|Tombstone Tool-Based Sequencing for Minimum Changes]]
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
