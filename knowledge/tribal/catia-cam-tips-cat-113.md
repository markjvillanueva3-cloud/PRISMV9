---
id: "cat-113"
title: "Chip-Break Drilling for Medium-Depth Holes"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "chip-break", "G73", "medium-depth", "drilling"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.889Z
---

# Chip-Break Drilling for Medium-Depth Holes

For holes 3-6x drill diameter deep, use CATIA's chip-break drilling cycle (G73 equivalent) instead of full peck (G83). Chip-break retracts the drill by only 1-3mm between pecks (enough to break the chip) rather than fully retracting to the R-plane. This saves significant cycle time — a 50mm deep hole with 5mm pecks requires 10 full retracts in G83 but only 10 quick retracts in G73. In CATIA, set the 'Retract' mode to 'Chip Break' and specify the break distance (1-3mm depending on material chip characteristics).

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[esprit-cam-tips-esp-080|Chip-Break Drilling for Efficient Chip Evacuation]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[catia-cam-tips-cat-112|Peck Drilling Cycle Configuration for Deep Holes]]
