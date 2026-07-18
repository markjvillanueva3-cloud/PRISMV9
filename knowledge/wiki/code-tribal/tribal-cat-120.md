---
name: tribal-cat-120
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "composite", "stack-drilling", "cfrp-metal", "variable-feed"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-120.md
promoted_at: 2026-06-09T22:31:16.058Z
---

# Stack Drilling Composites with Metallic Backing Plates

When drilling composite-metal stacks (CFRP over aluminum or titanium) in CATIA, program two-stage drilling: first drill through the composite at high speed (150-200 m/min) with low feed (0.03-0.05mm/rev), then switch to metal-appropriate parameters (60-80 m/min for titanium, 200-300 m/min for aluminum) at higher feed (0.08-0.15mm/rev). In CATIA, use the 'Variable Feed' drilling option to automatically change feedrate at the material interface depth. Define the material stack thickness in the CATIA operation parameters so the transition depth is computed correctly.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** drilling, composite_machining

## Related
- [[bobcad-cam-tips-bc-189|BobCAD CFRP/Metal Stack Drilling Parameters]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-118|Ply Trimming Tool Path Generation from CATIA Composites Design]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
