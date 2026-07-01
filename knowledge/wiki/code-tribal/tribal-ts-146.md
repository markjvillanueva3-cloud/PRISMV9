---
name: tribal-ts-146
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "wire-edm", "start-point", "threading", "optimization"]
confidence: 89
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-146.md
promoted_at: 2026-06-09T22:31:16.770Z
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
