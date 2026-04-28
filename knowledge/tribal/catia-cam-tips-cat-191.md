---
id: "cat-191"
title: "Core/Cavity Split Surface Machining Strategy in CATIA"
source: "web:catia-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["catia", "mold", "core-cavity", "parting-surface", "split"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.965Z
---

# Core/Cavity Split Surface Machining Strategy in CATIA

For mold core and cavity machining in CATIA, use the parting surface to define separate machining domains. Extract the parting surface from the Mold Tooling Design workbench and use it as a 'Limiting Contour' in Surface Machining operations. Machine the cavity side with negative Z values (downward from parting line) and the core side with positive Z values. Use separate Manufacturing Programs for core and cavity to assign different tool sets and strategies. For cavity machining, prioritize corner-radius end mills matching the mold fillet radii to minimize EDM electrode work. Always add 0.1-0.2mm stock allowance on shut-off surfaces for final fitting.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** roughing, finishing

## Related
- [[tebis-cam-tips-teb-068|Core/Cavity Split Surface Management]]
- [[catia-cam-tips-cat-046|Core Roughing for Tall Thin Features Requires Outside-In Strategy]]
- [[catia-cam-tips-cat-143|Surface Machining Multi-Surface Part Management with Check Surfaces]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[catia-cam-tips-cat-193|Runner and Gate Machining with Specialized CATIA Operations]]
