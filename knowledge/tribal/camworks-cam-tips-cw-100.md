---
id: "cw-100"
title: "Chip-Break Drilling — Partial Retract for Faster Deep Holes"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "drilling", "chip-break", "partial-retract", "cycle-time"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.721Z
---

# Chip-Break Drilling — Partial Retract for Faster Deep Holes

Chip-break drilling (G73) retracts only 1-3mm per peck cycle instead of fully retracting to the R-plane. This is 30-50% faster than full-retract peck drilling for the same depth. Use chip-break for materials that produce short chips (cast iron, brass, free-machining steel) where full chip evacuation is unnecessary — the small retract is just enough to break the chip. Avoid chip-break on gummy materials (304 SS, pure aluminum) where chips weld to the drill flutes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[esprit-cam-tips-esp-080|Chip-Break Drilling for Efficient Chip Evacuation]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
