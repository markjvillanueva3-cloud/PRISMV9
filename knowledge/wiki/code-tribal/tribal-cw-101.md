---
name: tribal-cw-101
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "drilling", "tapping", "rigid-tap", "thread"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-101.md
promoted_at: 2026-05-26T16:07:19.940Z
---

# Tapping — Synchronize Spindle Speed and Feed for Thread Quality

Set tapping feed rate as F = spindle RPM × thread pitch. CAMWorks calculates this automatically for rigid tapping (G84/G84.2). For floating tap holders, reduce RPM by 20% and use G84 (not rigid tap cycle). Always include a pilot hole operation 0.1-0.2mm larger than the tap minor diameter to prevent tap breakage. For blind hole tapping, set the tap depth to leave 2-3 threads of clearance above the bottom to account for the tap chamfer lead threads.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** drilling, tapping

## Related
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-097|Spot Drilling — Establish Accurate Hole Location Before Full Drill]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
