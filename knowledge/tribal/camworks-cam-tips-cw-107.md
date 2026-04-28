---
id: "cw-107"
title: "Cut Data Per Material — Store Tested Parameters for Each Tool-Material Pair"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "tool-management", "cut-data", "materials", "parameters"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.727Z
---

# Cut Data Per Material — Store Tested Parameters for Each Tool-Material Pair

For each tool in the library, store cutting data (Vc, fz, ap, ae) per material group. A 10mm carbide end mill has very different parameters for aluminum (Vc=300, fz=0.1) vs. stainless steel (Vc=80, fz=0.04) vs. hardened steel (Vc=40, fz=0.02). CAMWorks links tool selection to material via TechDB — when the programmer selects the workpiece material, all tools get appropriate cutting data automatically. Update these values based on actual shop floor performance, not just catalog data.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, turning

## Related
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
- [[camworks-cam-tips-cw-105|Tool Library — Maintain Accurate Tool Assemblies with Holders]]
- [[camworks-cam-tips-cw-106|Holder Geometry — Define Accurate Profiles for Collision Checking]]
- [[camworks-cam-tips-cw-108|Automatic Tool Selection — Let TechDB Choose the Best Tool]]
- [[camworks-cam-tips-cw-109|Tool Crib Management — Track Available Tools by Machine]]
