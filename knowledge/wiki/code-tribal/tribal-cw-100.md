---
name: tribal-cw-100
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "drilling", "chip-break", "partial-retract", "cycle-time"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-100.md
promoted_at: 2026-06-09T22:31:16.009Z
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
