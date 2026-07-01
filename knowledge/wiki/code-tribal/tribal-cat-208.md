---
name: tribal-cat-208
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "composite", "edge-trimming", "dust-extraction", "cfrp"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-208.md
promoted_at: 2026-06-09T22:31:16.080Z
---

# Composite Edge Trimming with Dust Extraction Path Planning

When programming CFRP edge trimming in CATIA, plan the tool path direction to work with the dust extraction system. Machine in climb milling direction to direct carbon fiber dust toward the vacuum collection point. In the CATIA operation, set the 'Tool Side' to ensure climb cutting and add a 'User Defined Event' for vacuum on/off (M-code mapped in the post processor). For parts with multiple trim edges, sequence the operations so the tool works outward from the vacuum nozzle position, preventing dust accumulation in the cutting zone. Carbon fiber dust is conductive and abrasive — inadequate extraction causes machine guide damage and electrical shorts.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:dassault-forum
**Operations:** composite_machining

## Related
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
- [[catia-cam-tips-cat-118|Ply Trimming Tool Path Generation from CATIA Composites Design]]
- [[catia-cam-tips-cat-119|Fiber Direction Awareness Prevents Delamination in Composite Machining]]
- [[catia-cam-tips-cat-120|Stack Drilling Composites with Metallic Backing Plates]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
