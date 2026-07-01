---
name: tribal-mc-238
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "common-line", "nested-parts", "kerf-saving", "shared-edge", "material-efficiency"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-238.md
promoted_at: 2026-06-09T22:31:16.454Z
---

# Common line cutting between nested parts saves one kerf width per shared edge

When two nested parts share a straight or compatible curved edge, common line cutting programs a single cut that separates both parts simultaneously. In Mastercam Nesting, enable common-line detection and set the minimum shared edge length (typically 20 mm or longer for stable cutting). Each common-line cut saves one cutter kerf width of material (3–6 mm for router cutters, 0.3–0.5 mm for wire EDM, 0.2–0.3 mm for laser). On a sheet with 50 parts and 30 shared edges, this saves 90–180 mm of cumulative material width — equivalent to fitting 1–3 additional parts per sheet. Common line cutting also reduces cycle time by eliminating redundant cuts. The limitation is that both parts sharing the edge must have the same profile tolerance requirement — if one part requires ±0.05 mm and the other ±0.2 mm, the common line must meet the tighter tolerance, which may not be cost-effective.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** nesting, routing

## Related
- [[mastercam-cam-tips-mc-169|Common line cutting shares edges between adjacent parts to eliminate double cuts and save material]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
