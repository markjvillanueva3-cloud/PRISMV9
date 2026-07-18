---
name: tribal-f360-182
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "composite", "diamond-coated", "drilling", "pcd"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-182.md
promoted_at: 2026-06-09T22:31:16.296Z
---

# Diamond-Coated Tools for Composite Drilling

When drilling CFRP or GFRP in Fusion, use PCD (polycrystalline diamond) or diamond-coated carbide drills. Standard carbide drills lose their edge after 20-50 holes in CFRP due to the extreme abrasiveness of carbon fibers. PCD drills last 500-2000 holes. Program the drill operation with: peck cycle (0.5-1x diameter pecks), reduced feed at entry (50% for first 1mm to prevent top-ply delamination), and reduced feed at exit (50% for last 1mm to prevent bottom-ply pushout). Use a support plate (sacrificial backing board) underneath the laminate to prevent exit delamination. Set spindle speed to 6000-10000 RPM and feed to 0.02-0.05mm/rev.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:autodesk-forum
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-181|CFRP Trimming with Compression Router]]
- [[fusion360-cam-tips-ext-f360-183|CFRP-Metal Stack Drilling Parameters]]
- [[fusion360-cam-tips-ext-f360-184|Composite Edge Finishing with Burr Tool]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
