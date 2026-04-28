---
id: "cat-051"
title: "NC Machine Simulation Requires Complete Machine Model"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "simulation", "machine-model", "kinematic", "collision"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.840Z
---

# NC Machine Simulation Requires Complete Machine Model

CATIA NC Machine Tool Simulation (MTS) requires a fully defined machine model built in the NC Machine Tool Builder workbench. The model must include kinematic chains (axes, joints, limits), physical volumes for collision checking, and travel limits matching the real machine. Without a complete machine model, simulation only checks tool-part collisions and misses fixture/spindle/table interferences. Build machine models as CATProduct assemblies with each moving component as a separate CATProduct with defined joints.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[camworks-cam-tips-cw-185|Machine Simulation with Full Kinematic Model — Crash Prevention]]
- [[edgecam-cam-tips-ec-068|Full Machine Simulation with Kinematic Model]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[sprutcam-cam-tips-spr-012|Machine Simulation Collision Detection Setup]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
