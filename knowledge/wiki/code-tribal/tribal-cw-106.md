---
name: tribal-cw-106
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tool-management", "holders", "collision", "geometry"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-106.md
promoted_at: 2026-06-09T22:31:16.010Z
---

# Holder Geometry — Define Accurate Profiles for Collision Checking

Model tool holders as multi-segment profiles (cone-cylinder-cone) that accurately represent the actual holder shape. ER collet holders have a wider grip section than the shank; shrink-fit holders are slim but have a flared retention knob. Import holder 3D models from manufacturer websites (most provide STEP files) for exact collision geometry. Inaccurate holder profiles cause either false collision alarms (over-simplified holders too large) or missed collisions (under-simplified holders too small).

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** milling, 5_axis

## Related
- [[camworks-cam-tips-cw-105|Tool Library — Maintain Accurate Tool Assemblies with Holders]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[camworks-cam-tips-cw-107|Cut Data Per Material — Store Tested Parameters for Each Tool-Material Pair]]
- [[camworks-cam-tips-cw-108|Automatic Tool Selection — Let TechDB Choose the Best Tool]]
