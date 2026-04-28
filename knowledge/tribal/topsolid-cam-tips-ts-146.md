---
id: "ts-146"
title: "TopSolid Wire EDM Start Point Optimization — Threading and Path Planning"
source: "web:topsolid-docs"
confidence: 89
category: "cam_strategy"
tags: ["topsolid", "wire-edm", "start-point", "threading", "optimization"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.497Z
---

# TopSolid Wire EDM Start Point Optimization — Threading and Path Planning

TopSolid optimizes start hole placement for Wire EDM: place start holes in scrap areas (inside cutout slugs or outside the part boundary), minimize the number of start holes by chaining multiple profiles, and use existing part features (bolt holes, clearance holes) as start points. The system also optimizes the cutting sequence to minimize wire threading operations — chain cuts that can share an entry point, and sequence multiple profiles to minimize total wire threading time.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[topsolid-cam-tips-ts-127|TopSolid'Cam 7 Automatic Toolpath Linking — Optimized Transition Moves]]
- [[topsolid-cam-tips-ts-142|TopSolid Wire EDM — Integrated Profile and Technology Management]]
- [[topsolid-cam-tips-ts-143|TopSolid Wire EDM 4-Axis Taper — Independent Upper and Lower Profiles]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
