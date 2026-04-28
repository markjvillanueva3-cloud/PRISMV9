---
id: "ec-139"
title: "Tombstone Collision Avoidance with Fixture Definition"
source: "web:edgecam-forum"
confidence: 0.85
category: "cam_strategy"
tags: ["tombstone", "collision-avoidance", "fixture", "simulator"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.375Z
---

# Tombstone Collision Avoidance with Fixture Definition

Define the complete tombstone assembly (base, columns, clamps, adjacent parts) as a fixture model in the Simulator. Enable collision checking against all fixture components during toolpath generation. Set clearance planes per face to account for clamps and part protrusions on adjacent faces. The simulator checks holder and tool body collisions against the full 360° fixture assembly — not just the current face.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:edgecam-forum
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-136|Edgecam Designer Assembly Mode for Multi-Component Fixtures]]
- [[controller-knowledge-tips-ctrl-003|Fanuc extended work offsets G54.1 P1-P300]]
- [[edgecam-cam-tips-ec-137|Tombstone Multi-Face Programming with Rotary Indexing]]
- [[edgecam-cam-tips-ec-141|Tombstone Tool-Based Sequencing for Minimum Changes]]
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
