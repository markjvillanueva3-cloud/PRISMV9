---
name: tribal-cat-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "stl", "hybrid", "additive", "subtractive"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-160.md
promoted_at: 2026-06-09T22:31:16.068Z
---

# Hybrid Manufacturing: Additive STL to Subtractive CATIA Workflow

For hybrid manufacturing workflows (additive build + subtractive finish), import the as-built STL scan as the stock body and the nominal CAD model as the part body in CATIA. The roughing operation removes the additive stock down to near-net shape, and finishing achieves the final CAD dimensions. Set the stock offset to 0mm (the STL IS the stock shape). Use 'Stock Model' update between roughing and finishing to track remaining material. This workflow is critical for aerospace repair: the STL scan captures the actual deposited geometry, ensuring the finish passes only remove the correct amount.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:dassault-forum
**Operations:** roughing, finishing

## Related
- [[esprit-cam-tips-esp-168|Hybrid Additive-Subtractive Programming in ESPRIT]]
- [[catia-cam-tips-cat-159|STL Machining in CATIA for 3D-Printed Part Post-Processing]]
- [[catia-cam-tips-cat-161|STL Model Segmentation for Selective Machining Regions]]
- [[catia-cam-tips-cat-162|STL to NURBS Conversion for Higher Quality CATIA Machining]]
- [[camworks-cam-tips-cw-194|Additive Stock Definition — Scan Data to CAMWorks Stock Model]]
