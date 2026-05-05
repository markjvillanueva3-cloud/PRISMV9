---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-fusion-003
title: BVH/GJK collision detection: bounding volume hierarchies + GJK algorithm for tool/holder/fixture checks
category: toolpath
domain: document_learned
knowledge_type: failure_mode
confidence: 85
source: document:Fusion360-Skill-Roadmap
created_at: 2026-03-06
usage_count: 0
tags: ["collision-detection", "BVH", "GJK", "bounding-volume", "holder-collision", "CAM", "simulation"]
material_groups: []
operation_types: []
content_hash: c402dd79b2ac7e8703b590f001d427dafb97ced7e03b9ae7a3ba6e759432ca8d
mirror_ts: 2026-05-05T13:36:03.225Z
mirror_engine: TribalVaultPopulatorEngine
---

# BVH/GJK collision detection: bounding volume hierarchies + GJK algorithm for tool/holder/fixture checks

**Category:** `toolpath` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:Fusion360-Skill-Roadmap`

## Tip

Modern CAM collision detection uses two-phase approach: (1) Broad phase: Bounding Volume Hierarchy (BVH) with AABB or OBB trees partitions the scene. Only overlapping bounding boxes trigger detailed checks. Reduces O(n²) to O(n log n). (2) Narrow phase: GJK (Gilbert-Johnson-Keerthi) algorithm computes minimum distance between convex shapes using Minkowski difference. For non-convex shapes: decompose into convex hulls first. Tool assembly model: shank (cylinder) + holder (stepped cylinder) + collet nut (cylinder). Each component gets its own BVH node. Check frequency: every 0.5-1mm along toolpath. False positives from oversized bounding volumes are OK (conservative). False negatives from under-checking are NOT OK (crash).

## Related tips

- [[f360-023|Stop on Collision for Real-Time Simulation Debugging]] _(tag:2)_
- [[gc-198|GibbsCAM simulation fixture and clamp modeling catches collisions before first article]] _(tag:2)_
- [[gc-125|GibbsCAM 14 Tool Holder Visualization in simulation prevents costly collisions]] _(tag:2)_
- [[ts-061|Full Machine Simulation with Kinematic Chain]] _(tag:1)_
- [[hm-001|hyperMILL collision check requires pre-defined stock model and tool holder definition]] _(tag:1)_

## Tags

#collision-detection #bvh #gjk #bounding-volume #holder-collision #cam #simulation
