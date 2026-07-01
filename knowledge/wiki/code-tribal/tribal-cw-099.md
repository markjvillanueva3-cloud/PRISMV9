---
name: tribal-cw-099
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "drilling", "peck", "deep-hole", "chip-evacuation"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-099.md
promoted_at: 2026-05-26T16:07:19.937Z
---

# Peck Drilling — Deep Hole Chip Evacuation with Full Retract

Peck drilling (G83) fully retracts the drill to the R-plane after each peck to clear chips. Set initial peck depth to 1-2x drill diameter, reducing by 20-30% per subsequent peck as the hole deepens. Full retract pecking is essential for materials that produce long stringy chips (stainless steel, aluminum) that can pack in the flutes. The retract dwell at the R-plane should be just long enough for coolant to flush the hole (0.5-1 second). CAMWorks calculates peck schedule automatically from TechDB.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-168|Swiss-Type Micro-Drilling — Deep Holes in Small Diameters]]
- [[tebis-cam-tips-teb-014|Cooling Channel Drilling Uses Deep-Hole Templates]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
