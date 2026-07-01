---
name: tribal-gc-114
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "material-specific", "composite", "carbon-fiber", "delamination", "router"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-114.md
promoted_at: 2026-06-09T22:31:16.341Z
---

# Composite machining requires compression routers and dust extraction setup

Carbon fiber and fiberglass composites produce abrasive dust rather than metal chips. In GibbsCAM, use compression (up-down) router cutters that cut cleanly on both the top and bottom laminate faces without delamination. Set surface speed high (200-500 m/min) with low feed per tooth (0.03-0.08mm) to minimize delamination force. Program climb milling for the final contour pass. Define the tool as a router-type with diamond or PCD coating. Enable dust extraction M-codes in the post processor. For thick composites (>10mm), use a stacked cutting approach: machine the top layers first, then deepen progressively to prevent push-out delamination on exit.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-182|GibbsCAM composite drilling with orbital motion eliminates fiber breakout]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[gibbscam-cam-tips-gc-095|Material-specific cutting data tables eliminate manual speed/feed calculation]]
