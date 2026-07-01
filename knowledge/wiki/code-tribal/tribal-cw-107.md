---
name: tribal-cw-107
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tool-management", "cut-data", "materials", "parameters"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-107.md
promoted_at: 2026-05-26T16:07:19.945Z
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
