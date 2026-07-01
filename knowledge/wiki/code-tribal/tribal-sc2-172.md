---
name: tribal-sc2-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "drilling", "delamination", "peck-cycle", "brad-point"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-172.md
promoted_at: 2026-06-09T22:31:16.697Z
---

# SURFCAM Composite Drilling Strategies to Prevent Delamination

Drilling composites in SURFCAM requires peck cycles with reduced feed at entry and exit plies to prevent delamination. Program a two-stage feed: 50% feed rate for the first and last 1mm of the laminate, full feed rate for the middle section. Use SURFCAM's custom drill cycle to define these feed transitions. Brad-point or dagger drills outperform twist drills in composites. Set spindle speed to 4000-8000 RPM for CFRP with 0.03-0.08 mm/rev feed. Enable backup plate support in the fixture to prevent exit delamination.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** drilling

## Related
- [[bobcad-cam-tips-bc-188|BobCAD Composite Drilling with Delamination Prevention]]
- [[worknc-cam-tips-wnc-163|Composite Drilling — Preventing Entry and Exit Delamination]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
